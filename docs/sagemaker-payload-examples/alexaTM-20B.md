# AlexaTM 20B

Sample values for the model are:

<table>

<tr>
<td> Model Id </td> <td> Model Input Schema </td> <td> Model Output JSONPath </td>
</tr>

<tr>
<td> pytorch-textgeneration1-alexa20b </td>
<td>

```json
{
    "text_inputs": "<<prompt>>",
    "num_beams": "<<num_beams>>",
    "no_repeat_ngram_size": "<<no_repeat_ngram_size>>"
}
```

</td>
<td>

```json
$.generated_texts[0]
```

</td>
</tr>

</table>


## Model Payload

The input schemas provided here are inferred from model payloads to replace the actual values supplied at run time. For example, sample model payload for the input schema provided above is:

```json
{
    "text_inputs": "[CLM] My name is Lewis and I like to",
    "num_beams": 5,
    "no_repeat_ngram_size": 2
}
```

Please refer to model documentation and SageMaker JumpStart jupyter notebook to see the most up-to-date supported parameters.
