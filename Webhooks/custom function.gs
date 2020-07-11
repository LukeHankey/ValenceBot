function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Webhook")
  .addItem("Send Discord Message", "webhook")
  .addToUi();
}

/**
* Send a message to the Discord Server. Example: webhook(1, A1, "11806A")
* 
* @param {number} num Fact number or cell range [OPTIONAL]
* @param {string} messageRange The cell range, or custom message in, which is the message to be sent. [REQUIRED]
* @param {colorValue} color The color of the webhook in hexadecimal code. If no color is specified, a random color will be applied. [OPTIONAL]
* 
* @customfunction
**/

function webhook(num, messageRange, color) {
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var range = sheet.getActiveRange();
  var values = range.getValues();
  var webhookValue = values[0];  
  
  for (var i = 0; i < values.length; i++) {
    if (typeof webhookValue[i] == "string") {
      messageRange = messageRange || webhookValue[i];
    }
    var filteredArray = webhookValue.filter(function(value, index, arr) {
      return index > 0})
    if (typeof filteredArray[i] == "string") {
      color = color || filteredArray[i];
    }
    var colorArray = filteredArray.filter(function(value, index, arr) {
      return value})
    color = color || colorArray[0];
    values
    };        
  
  if (!num && !messageRange && !color) {
    throw "Enter some parameters. Type '=webhook' or select a range."
  }; 
  
  if (!color) {
    var randomColor = Math.floor(Math.random()*16777215).toString(16);
    var colorGen = parseInt(randomColor, 16);
  } 
  else if (color.indexOf("#")>=0) {
    throw "Try again without the '#'.";
  }
  else if (color = colorArray[0]) {
    var colorGen = parseInt(color, 16);
  };
  
  if (messageRange == range) {
    return
  } else if (!messageRange) {
    throw "You must provide a message."
  };
  
  var name = "<@&685419137530331143>";
  var discordUrl = 'https://discordapp.com/api/webhooks/685419964488089622/QjqteJiaPudbJgV3NZeZhp1TzYILi43LbUjZPQAsvW5g68cyBXJZZ2AAZKPs00-IZb6U';
  
  var data = {
    "username": "Valence Facts",
    "avatar_url": "https://cdn.discordapp.com/icons/472448603642920973/edece467d8779ca2815a6d286f4a81de.png?size=256",
    //    "content": ",
    "embeds": [
      {
        "title": "Daily Valence Fact #" + num,
        "description": messageRange,
        "color":  colorGen,
        "fields": [
        {
        "name": "Sent By:",
        "value": name,
        "inline": true
      },
    ]
      }
    ]
  };
  
    if (!num) {
      data.embeds[0]["title"] = "Daily Valence Fact";
  };
  
  var options = {
    method: "post",
    headers: {
      "content-Type": "application/json",
      "Authorization": "Bot hQz4-af0ut31DjrgyYakt4w-CWak7tgsjvu55GcA2reCBh3yD-VDHRZPdyPXQw9W_Lc6",
    },
    payload: JSON.stringify(data),
    allowed_mentions: true,
    contentType: "application/json; charset=utf-8",
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(discordUrl, options);
  Logger.log(response.getContentText());
};