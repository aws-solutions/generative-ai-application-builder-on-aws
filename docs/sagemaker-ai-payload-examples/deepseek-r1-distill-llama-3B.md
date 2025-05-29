# DeepSeek R1 Distill Llama 8B

<table>

<tr>
<td> Model Id </td> <td> Model Input Schema </td> <td> Model Output JSONPath </td>
</tr>

<tr>
<td> deepseek-r1-distill-llama-3B </td>
<td>

```json
{
    "inputs": "<<prompt>>",
    "parameters": {
        "temperature": "<<temperature>>"
    }
}
```

</td>
<td>

```json
$.generated_text
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
        "temperature": 0.1
    }
}
```

Please refer to model documentation and test inferences available in SageMaker AI to see the most up-to-date supported parameters.
