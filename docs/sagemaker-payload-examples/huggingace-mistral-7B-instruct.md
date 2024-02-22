# Mistral 7B Instruct

<table>

<tr>
<td> Model Id </td> <td> Model Input Schema </td> <td> Model Output JSONPath </td>
</tr>

<tr>
<td> huggingface-llm-mistral-7b-instruct </td>
<td>

```json
{
    "inputs": "<<prompt>>",
    "parameters": {
        "temperature": "<<temperature>>",
        "max_new_tokens": "<<max_new_tokens>>",
        "do_sample": "<<do_sample>>"
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
    "inputs": "Write the code to compute factorial of a number in Python.",
    "parameters": {
        "temperature": 0.4,
        "max_new_tokens": 200,
        "do_sample": true
    }
}
```

Please refer to model documentation and SageMaker JumpStart jupyter notebook to see the most up-to-date supported parameters.
