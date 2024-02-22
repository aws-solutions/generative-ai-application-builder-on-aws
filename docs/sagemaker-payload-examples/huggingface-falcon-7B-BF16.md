# Falcon 7B BF16

<table>

<tr>
<td> Model Id </td> <td> Model Input Schema </td> <td> Model Output JSONPath </td>
</tr>

<tr>
<td> huggingface-llm-falcon-7b-bf16 </td>
<td>

```json
{
    "inputs": "<<prompt>>",
    "parameters": {
        "do_sample": "<<do_sample>>",
        "top_p": "<<top_p>>",
        "temperature": "<<temperature>>",
        "max_new_tokens": "<<max_new_tokens>>",
        "stop": "<<stop>>"
    }
}
```

</td>
<td>

```json
$[0].generated_text
```

</td>
</tr>

</table>

## Model Payload

The input schemas provided here are inferred from model payloads to replace the actual values supplied at run time. For example, sample model payload for the input schema provided above is:

```json
{
    "inputs": "Write a haiku on the weather in London.",
    "parameters": {
        "do_sample": true,
        "top_p": 0.2,
        "temperature": 0.4,
        "max_new_tokens": 200,
        "stop": ["<|endoftext|>", "</s>"]
    }
}
```

Please refer to model documentation and SageMaker JumpStart jupyter notebook to see the most up-to-date supported parameters.
