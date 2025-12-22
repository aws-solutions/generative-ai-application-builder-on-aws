#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Lex V2 code hook for Amazon Connect voice -> AgentCore runtime (scheduler).

Flow (MVP):
- Connect contact flow sets contact attributes (tenantId/useCaseId) via ConnectVoiceAdapterLambda
- Connect "Get customer input" (Lex V2) passes those as Lex session attributes
- Lex invokes this Lambda, which:
  - resolves the deployment stack via UseCasesTable
  - extracts AgentRuntimeArn from CloudFormation stack Outputs
  - invokes AgentCore runtime with the caller utterance
  - returns plain text back to Lex/Connect to speak
"""

import json
import os
import time
import hashlib
from typing import Any, Dict, Optional

import boto3
from botocore.config import Config


USE_CASES_TABLE_NAME = os.environ.get("USE_CASES_TABLE_NAME")
if not USE_CASES_TABLE_NAME:
    raise RuntimeError("USE_CASES_TABLE_NAME is not set")

VOICE_CONVERSATIONS_TABLE_NAME = os.environ.get("VOICE_CONVERSATIONS_TABLE_NAME")
if not VOICE_CONVERSATIONS_TABLE_NAME:
    raise RuntimeError("VOICE_CONVERSATIONS_TABLE_NAME is not set")


_ddb = boto3.client("dynamodb")
_cfn = boto3.client("cloudformation")
_agentcore = boto3.client(
    "bedrock-agentcore",
    config=Config(read_timeout=60, connect_timeout=5, retries={"max_attempts": 2, "mode": "standard"}),
)

def _stable_runtime_session_id(conversation_id: str, user_id: str) -> str:
    """
    Bedrock AgentCore enforces min length constraints on runtimeSessionId.
    Generate a stable, sufficiently-long id from conversation+user.
    """
    base = f"{conversation_id}:{user_id}".encode("utf-8")
    digest = hashlib.sha256(base).hexdigest()  # 64 chars
    # Prefix helps debugging; length will be 68 (> 33 min).
    return f"lex-{digest}"


def _session_attrs(event: Dict[str, Any]) -> Dict[str, str]:
    return (event.get("sessionState") or {}).get("sessionAttributes") or {}


def _get_lex_intent(event: Dict[str, Any]) -> Dict[str, Any]:
    return (event.get("sessionState") or {}).get("intent") or {"name": "FallbackIntent", "state": "InProgress"}

def _is_end_call(text: str) -> bool:
    t = (text or "").strip().lower()
    if not t:
        return False
    end_phrases = (
        "thanks",
        "thank you",
        "thx",
        "that’s all",
        "thats all",
        "all set",
        "goodbye",
        "bye",
        "no thanks",
        "no thank you",
    )
    return any(p in t for p in end_phrases)

def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def _ttl_epoch(days: int) -> int:
    return int(time.time()) + (days * 24 * 60 * 60)

def _emit_emf(metric_name: str, value: float, dims: Dict[str, str]) -> None:
    """
    Emit CloudWatch Embedded Metrics Format (no PutMetricData permission needed).
    """
    ts_ms = int(time.time() * 1000)
    # Keep dimensions small and stable.
    safe_dims = {k: str(v)[:100] for k, v in (dims or {}).items()}
    doc = {
        "_aws": {
            "Timestamp": ts_ms,
            "CloudWatchMetrics": [
                {
                    "Namespace": "Solution/Voice",
                    "Dimensions": [list(safe_dims.keys())] if safe_dims else [[]],
                    "Metrics": [{"Name": metric_name, "Unit": "Count" if metric_name.endswith("Count") else "Milliseconds"}],
                }
            ],
        },
        metric_name: value,
        **safe_dims,
    }
    print(json.dumps(doc))

def _update_conversation_kpi(
    *,
    tenant_id: str,
    conversation_id: str,
    use_case_id: str,
    ended: bool,
    end_reason: Optional[str],
    error_message: Optional[str],
    latency_ms: int,
) -> None:
    """
    Update a per-conversation KPI record. Avoid storing raw transcripts (PII).
    """
    now = _now_iso()
    update_expr = [
        "SET UseCaseId = :uc",
        "SET Channel = :ch",
        "SET LastUpdatedAt = :now",
        "SET StartedAt = if_not_exists(StartedAt, :now)",
        "SET TTL = if_not_exists(TTL, :ttl)",
        "SET LastLatencyMs = :lat",
    ]
    expr_vals: Dict[str, Any] = {
        ":uc": {"S": use_case_id},
        ":ch": {"S": "voice"},
        ":now": {"S": now},
        ":ttl": {"N": str(_ttl_epoch(30))},  # keep 30 days by default
        ":lat": {"N": str(latency_ms)},
        ":one": {"N": "1"},
        ":ended": {"BOOL": bool(ended)},
    }

    # turn counter
    update_expr.append("ADD TurnCount :one")

    update_expr.append("SET Ended = :ended")
    if ended:
        update_expr.append("SET EndedAt = :now")
    if end_reason:
        update_expr.append("SET EndReason = :endReason")
        expr_vals[":endReason"] = {"S": str(end_reason)[:200]}
    if error_message:
        update_expr.append("SET LastError = :err")
        expr_vals[":err"] = {"S": str(error_message)[:500]}

    _ddb.update_item(
        TableName=VOICE_CONVERSATIONS_TABLE_NAME,
        Key={"TenantId": {"S": tenant_id}, "ConversationId": {"S": conversation_id}},
        UpdateExpression=" ".join(update_expr),
        ExpressionAttributeValues=expr_vals,
    )


def _lex_response(
    *,
    event: Dict[str, Any],
    content: str,
    close: bool,
    session_attributes: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    intent = _get_lex_intent(event)
    attrs = session_attributes if session_attributes is not None else _session_attrs(event)

    return {
        "sessionState": {
            "sessionAttributes": attrs,
            "dialogAction": {"type": "Close" if close else "ElicitIntent"},
            "intent": {**intent, "state": "Fulfilled" if close else intent.get("state", "InProgress")},
        },
        "messages": [{"contentType": "PlainText", "content": content}],
    }


def _extract_text_from_agentcore_response(resp: Dict[str, Any]) -> str:
    response_content = resp.get("response")
    if response_content is None:
        return ""

    if hasattr(response_content, "read"):
        raw = response_content.read()
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode("utf-8", errors="replace")
    else:
        raw = response_content

    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8", errors="replace")

    def _extract_from_dict(d: Dict[str, Any]) -> str:
        # AgentCore may return streaming-style chunks where errors are embedded as JSON.
        if d.get("type") == "error" or "error" in d:
            return str(d.get("message") or d.get("error") or "An error occurred.")
        if d.get("type") == "content" and d.get("text"):
            return str(d.get("text"))
        if isinstance(d.get("delta"), dict) and d["delta"].get("text"):
            return str(d["delta"]["text"])
        for k in ("result", "text", "content", "message", "output", "response"):
            if d.get(k):
                return str(d.get(k))
        return ""

    if isinstance(raw, dict):
        text = _extract_from_dict(raw)
        return text or json.dumps(raw)

    if isinstance(raw, str):
        raw_str = raw.strip()
        # Streaming responses often look like: "data: {...}\n\ndata: {...}\n"
        # Parse per-line and concatenate content chunks.
        chunks: list[str] = []
        for line in raw_str.splitlines():
            line = line.strip()
            if not line:
                continue
            if line.startswith("data:"):
                line = line[5:].strip()
            try:
                parsed = json.loads(line)
            except Exception:
                continue
            if isinstance(parsed, dict):
                extracted = _extract_from_dict(parsed)
                if extracted:
                    # If it's an error, return immediately (it's higher-signal than partial content)
                    if parsed.get("type") == "error" or "error" in parsed:
                        return extracted
                    chunks.append(extracted)
        if chunks:
            return " ".join(chunks).strip()

        # Fallback: maybe it's a single JSON object
        try:
            parsed2 = json.loads(raw_str)
            if isinstance(parsed2, dict):
                extracted2 = _extract_from_dict(parsed2)
                if extracted2:
                    return extracted2
        except Exception:
            pass

        return raw_str

    return str(raw)


def _get_stack_id_for_use_case(use_case_id: str) -> Dict[str, str]:
    item = _ddb.get_item(
        TableName=USE_CASES_TABLE_NAME,
        Key={"UseCaseId": {"S": use_case_id}},
        ConsistentRead=True,
    ).get("Item")

    if not item:
        raise RuntimeError("Unknown useCaseId (not found in UseCasesTable)")

    stack_id = (item.get("StackId") or {}).get("S")
    tenant_id = (item.get("TenantId") or {}).get("S")

    if not stack_id:
        raise RuntimeError("Use case record is missing StackId")

    return {"stackId": stack_id, "tenantId": tenant_id or ""}


def _get_agent_runtime_arn_from_stack(stack_id: str) -> str:
    stacks = _cfn.describe_stacks(StackName=stack_id).get("Stacks") or []
    if not stacks:
        raise RuntimeError("CloudFormation stack not found")
    outputs = stacks[0].get("Outputs") or []

    for out in outputs:
        if out.get("OutputKey") == "AgentRuntimeArn" and out.get("OutputValue"):
            return out["OutputValue"]

    raise RuntimeError("AgentRuntimeArn not found in stack outputs")


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    # Minimal logs for debugging Connect/Lex wiring (avoid printing full utterances)
    try:
        attrs = _session_attrs(event)
        intent = _get_lex_intent(event)
        print(
            json.dumps(
                {
                    "msg": "lex_event",
                    "hasInputTranscript": bool((event.get("inputTranscript") or "").strip()),
                    "sessionAttrKeys": sorted(list(attrs.keys()))[:50],
                    "hasTenantId": bool((attrs.get("tenantId") or "").strip()),
                    "hasUseCaseId": bool((attrs.get("useCaseId") or "").strip()),
                    "intentName": intent.get("name"),
                    "invocationSource": event.get("invocationSource"),
                }
            )
        )
    except Exception as _e:  # best-effort
        pass

    # Lex provides the recognized utterance here
    input_text = (event.get("inputTranscript") or "").strip()
    if not input_text:
        return _lex_response(event=event, content="Say that again?", close=False)

    attrs = dict(_session_attrs(event))
    tenant_id = (attrs.get("tenantId") or "").strip()
    use_case_id = (attrs.get("useCaseId") or "").strip()

    if not use_case_id:
        return _lex_response(
            event=event,
            content="I’m missing routing information for this number. Please contact support.",
            close=True,
        )

    # End call if the user indicates they're done. We also add a Lex intent for this and route it to Disconnect in Connect.
    intent_name = (_get_lex_intent(event).get("name") or "").strip()
    if intent_name == "EndCallIntent" or _is_end_call(input_text):
        # Best-effort KPI update
        try:
            conv_id = (attrs.get("conversationId") or event.get("sessionId") or f"lex-{int(time.time())}").strip()
            _update_conversation_kpi(
                tenant_id=tenant_id or "UNKNOWN",
                conversation_id=conv_id,
                use_case_id=use_case_id,
                ended=True,
                end_reason="user_end",
                error_message=None,
                latency_ms=0,
            )
            _emit_emf("EndCallCount", 1, {"UseCaseId": use_case_id, "TenantId": tenant_id or "UNKNOWN"})
        except Exception:
            pass
        return _lex_response(event=event, content="You're welcome. Goodbye.", close=True, session_attributes=attrs)

    # Resolve deployment stack and ensure tenant matches (when provided)
    resolved = _get_stack_id_for_use_case(use_case_id)
    if tenant_id and resolved["tenantId"] and tenant_id != resolved["tenantId"]:
        return _lex_response(
            event=event,
            content="This call is not authorized for the requested tenant.",
            close=True,
        )

    stack_id = resolved["stackId"]
    agent_runtime_arn = _get_agent_runtime_arn_from_stack(stack_id)

    # Persist stable IDs across turns
    conversation_id = (attrs.get("conversationId") or event.get("sessionId") or f"lex-{int(time.time())}").strip()
    user_id = (attrs.get("userId") or event.get("sessionId") or "lex-user").strip()
    message_id = f"lex-{int(time.time() * 1000)}"

    payload = {
        "conversationId": conversation_id,
        "messageId": message_id,
        "input": input_text,
        "userId": user_id,
    }

    start = time.time()
    resp = _agentcore.invoke_agent_runtime(
        agentRuntimeArn=agent_runtime_arn,
        payload=json.dumps(payload).encode("utf-8"),
        contentType="application/json",
        accept="application/json",
        runtimeUserId=user_id,
        runtimeSessionId=_stable_runtime_session_id(conversation_id, user_id),
    )

    text = _extract_text_from_agentcore_response(resp).strip()
    if not text:
        text = "I couldn’t generate a response. Please try again."

    latency_ms = int((time.time() - start) * 1000)
    # Metrics + KPI record (best-effort)
    try:
        ended = False
        end_reason = None
        err = None
        if text.lower().startswith("an error occurred"):
            err = text
            _emit_emf("TurnErrorCount", 1, {"UseCaseId": use_case_id, "TenantId": resolved["tenantId"] or "UNKNOWN"})
        else:
            _emit_emf("TurnSuccessCount", 1, {"UseCaseId": use_case_id, "TenantId": resolved["tenantId"] or "UNKNOWN"})
        _emit_emf("TurnLatencyMs", latency_ms, {"UseCaseId": use_case_id, "TenantId": resolved["tenantId"] or "UNKNOWN"})
        _update_conversation_kpi(
            tenant_id=resolved["tenantId"] or "UNKNOWN",
            conversation_id=conversation_id,
            use_case_id=use_case_id,
            ended=ended,
            end_reason=end_reason,
            error_message=err,
            latency_ms=latency_ms,
        )
    except Exception:
        pass

    # Keep routing + conversation context in session attributes
    attrs["tenantId"] = resolved["tenantId"] or tenant_id
    attrs["useCaseId"] = use_case_id
    attrs["conversationId"] = conversation_id
    attrs["userId"] = user_id

    # Keep the call open by default; agent can prompt for next question.
    return _lex_response(event=event, content=text, close=False, session_attributes=attrs)


