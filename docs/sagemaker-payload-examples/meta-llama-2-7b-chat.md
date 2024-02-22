# Llama 2 7B Chat model

<table>

<tr>
<td> Model Id </td> <td> Model Input Schema </td> <td> Model Output JSONPath </td>
</tr>

<tr>
<td> meta-textgeneration-llama-2-7b-f </td>
<td>

```json
{
    "inputs": "<<prompt>>",
    "parameters": {
        "temperature": "<<temperature>>",
        "max_new_tokens": "<<max_new_tokens>>",
        "top_p": "<<top_p>>",
        "decoder_input_details": "<<decoder_input_details>>",
        "details": "<<details>>"
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
    "inputs": "<s> [INST] what is the recipe of mayonnaise? [/INST]",
    "parameters": {
        "temperature": 0.6,
        "max_new_tokens": 256,
        "top_p": 0.9,
        "decoder_input_details": true,
        "details": true
    }
}
```

Please refer to model documentation and SageMaker JumpStart jupyter notebook to see the most up-to-date supported parameters.
