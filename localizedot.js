console.log('starting dot loc');

const fs = require('fs');
if (!fs.existsSync('./loc_dot_views')) {
  fs.mkdirSync('./loc_dot_views');
}

fs.readdirSync('./dot_views').forEach(file => {
  var parts = file.split('.');
  if (parts.length < 1 || parts[1] != 'dot') {
    return;
  }
  var buf = fs.readFileSync('./dot_views/'+file);
  var original = buf.toString('ascii');
  // TODO: load gettext .mo file using gettext-parser, and translate all keys.
  // Using regex instead of multiple str.replace()s might be more a headache
  // than its worth, since translation only happens once on server startup.
  var en = original.replace('_(Homepage)', 'Homepage');
  var jp = original.replace('_(Homepage)', '&#x30DB;&#x30FC;&#x30E0;');
  var templname = parts[0];
  fs.writeFileSync(`./loc_dot_views/${templname}_en.dot`, en);
  fs.writeFileSync(`./loc_dot_views/${templname}_jp.dot`, jp);
})

console.log('finished dot loc');
