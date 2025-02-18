exports.default = function (source) {
  if (source.includes('exports.BaseContext')) {
    return source
  } else {
    return source + 'exports.BaseContext = BaseContext;'
  }
}
