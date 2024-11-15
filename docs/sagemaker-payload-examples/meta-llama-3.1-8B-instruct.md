# Llama 3.1 8B Chat model

<table>

<tr>
<td> Model Id </td> <td> Model Input Schema </td> <td> Model Output JSONPath </td>
</tr>

<tr>
<td> meta-textgeneration-llama-3-1-8b-instruct </td>
<td>

```json
{
    "inputs": "<<prompt>>",
    "parameters": {
        "temperature": "<<temperature>>",
        "max_new_tokens": "<<max_new_tokens>>",
        "top_p": "<<top_p>>"
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
    "inputs": "<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\nwhat is the recipe of mayonnaise?<|eot_id|><|start_header_id|>assistant<|end_header_id|>",
    "parameters": {
        "temperature": 0.6,
        "max_new_tokens": 256,
        "top_p": 0.9
    }
}
```

Please refer to model documentation and SageMaker JumpStart jupyter notebook to see the most up-to-date supported parameters.
