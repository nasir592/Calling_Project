function parseTemplate(template, data) {
    return template.replace(/\$\{(.*?)\}/g, (match, key) => {
      const value = key.split('.').reduce((acc, part) => acc?.[part], data);
      return value !== undefined ? value : match;
    });
  }
  
  module.exports = parseTemplate;
  