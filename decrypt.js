function(context, args) // key:"the-key", input:"long string"
{
  var base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

  if (!args || !args.key || !args.input) {
    return 'max.decrypt{ key:"the-key", input:"long string" }'
  }
  var key = args.key
  var input = args.input

  var output = ""
  var input_index = 0;
  var key_index = 0;
  while (input_index < input.length) {
    output += next_letter(true)
    output += next_letter(true)
    output += next_letter(false)
  }

  return output

  function next_letter(incr_key) {
    if (input_index >= input.length) return ""

    var input_letter = input[input_index]
    var input_number = base64_chars.indexOf(input_letter)

    var key_letter = key[key_index]
    var key_number = base64_chars.indexOf(key_letter)

    var diff = input_number - key_number
    var result_letter = base64_chars[(diff + base64_chars.length) % base64_chars.length]
    
    input_index++
    if (incr_key) {
      key_index++
      key_index = key_index % key.length
    }

    return result_letter
  }
}
