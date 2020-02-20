// 允许的第三方前端域名，精确匹配
const allowDomains = [
  /^localhost$/,
  /^127\./,
  /^172\./,
  /^192\./,
  /^localhost:8080$/,
]

module.exports = async (ctx, next) => {
  let { origin } = ctx.request.headers
  if (origin) {
    // 不考虑端口和协议
    let domain = (origin.split('/').slice(-1)[0] || '').split(':')[0] || ''
    if (domain && allowDomains.find(d => d.test(domain))) {
      ctx.set('Access-Control-Allow-Origin', origin)
      ctx.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,PATCH')
      ctx.set('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,token,cache,x-api-token')
    }
  }
  if (ctx.method.toUpperCase() === 'OPTIONS') {
    ctx.body = ''
    ctx.status = 200
  } else {
    await next()
  }
}
