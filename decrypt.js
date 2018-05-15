function(context, args) // key:"the-key", str:"long string"
{
  if (!args || !args.key || !(args.input || args.str)) {
    return 'max.decrypt{ key:"thekey", str:"inputstring" }'
  }

  var base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
  var base64_inv = {}; 
  for (var i = 0; i < base64_chars.length; i++) {
    base64_inv[base64_chars[i]] = i;
  }

  var key = args.key
  var input = args.input || args.str

  var input_index = 0;
  var key_index = 0;

  for (var skip_freq = 1; skip_freq <= 7; skip_freq++) {
    for (var skip_forward = 0; skip_forward <= 1; skip_forward++) {
      for (var subtract = 0; subtract <= 1; subtract++) {
        var output = decrypt_once(skip_freq, !!skip_forward, !!subtract)
        if (!output) continue

        var decoded = base64_decode(output)
        if (decoded) {
          return decoded
        }
      }
    }
  }

  function decrypt_once(skip_freq, skip_forward, subtract){
    var output = ""
    input_index = 0;
    key_index = 0;

    while (input_index < input.length) {
      var letter = next_letter(subtract)
      if (letter == "=" && input_index < input.length - 2) {
        return false
      }
      output += letter

      input_index++
      key_index++
      if (input_index % skip_freq == 0) {
        if (skip_forward) {
          key_index++
        } else {
          key_index--
        }
      }
      key_index = key_index % key.length

      if (output.length % 4 == 0) {
        var last4 = output.substr(-4)
        if (!looks_valid(base64_decode(last4))) return false
      }
    }

    return output
  }

  function next_letter(subtract) {
    if (input_index >= input.length) return ""

    var input_letter = input[input_index]
    var input_number = base64_inv[input_letter]

    var key_letter = key[key_index]
    var key_number = base64_inv[key_letter]

    var answer_number = input_number;
    if (subtract) {
      answer_number -= key_number
    } else {
      answer_number += key_number
    }

    var result_letter = base64_chars[(answer_number + base64_chars.length) % base64_chars.length]

    return result_letter
  }

  // copied from https://en.wikibooks.org/wiki/Algorithm_Implementation/Miscellaneous/Base64#Javascript_2
  function base64_decode (s) {
    // replace any incoming padding with a zero pad (the 'A' character is zero)
    var p = (s.charAt(s.length-1) == '=' ? 
            (s.charAt(s.length-2) == '=' ? 'AA' : 'A') : ""); 
    var r = ""; 
    s = s.substr(0, s.length - p.length) + p;

    // increment over the length of this encoded string, four characters at a time
    for (var c = 0; c < s.length; c += 4) {

      // each of these four characters represents a 6-bit index in the base64 characters list
      //  which, when concatenated, will give the 24-bit number for the original 3 characters
      var n = (base64_inv[s.charAt(c)] << 18) + (base64_inv[s.charAt(c+1)] << 12) +
              (base64_inv[s.charAt(c+2)] << 6) + base64_inv[s.charAt(c+3)];

      // split the 24-bit number into the original three 8-bit (ASCII) characters
      r += String.fromCharCode((n >>> 16) & 255, (n >>> 8) & 255, n & 255);
    }
     // remove any zero pad that was added to make this a multiple of 24 bits
    return r.substring(0, r.length - p.length);
  }

  function looks_valid(str) {
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i)
      if (code < 32 && code != 13 && code != 10) return false
      if (code >= 132 && code <= 160) return false
      if (code > 195) return false
    }
    return true
  }
}
