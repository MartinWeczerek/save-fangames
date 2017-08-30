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
if (!locale) {
  locale = 'en';
}

// TODO: Somehow auto-generate this file with a JS object containing
// translation data embedded in it. For example, maybe:

// %%%%%

// then server.js on startup replaces "%%%%%" with 
// var dictionary = {jp:{'Log in':'Log in JP'},en:{'Log in':'Log in'}};
// (with the data being read from a .mo file)

// then the new, valid localize.js file gets webpacked and we're all dandy.

module.exports = {
  _: function(key) {
    if (key == 'Log in') {
      if (locale == 'en') return 'Log in'
      else return '\u30ED\u30B0\u30A4\u30F3'
    }
    return 'placeholder localization: not localized';
  }
}
