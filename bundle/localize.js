function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

var locale = readCookie('locale');
// Cookie should have been set by Set-Cookie header from server,
// but just in case it was cleared, default to en.
if (!locale) {
  locale = 'en';
}

import * as locdata from './locdata';

module.exports = {
  _: function(key) {
    var t = locdata.data[locale];
    if (!t) {
      console.log('Unrecognized locale: '+locale);
      return key;
    }
    t = t[key];
    if (t) {
      t = t.msgstr[0];
      if (!t) {
        console.log('Empty translation for key '+key+' in locale '+locale);
        return key;
      }
      return t;
    } else {
      console.log('Unrecognized key '+key+' in locale '+locale);
      return key;
    }
  }
}
