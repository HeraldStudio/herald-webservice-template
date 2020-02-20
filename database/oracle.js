const oracledb = require('oracledb')
const dbSecret = require('./oracle-secret.js')

oracledb.autoCommit = true
let connectionPool = null

module.exports = {
  async getConnection() {
    if(!connectionPool){
      connectionPool = await oracledb.createPool({ 
        _enableStats: true,
        ...dbSecret.xgbxsc
      })

      if (program.mode === 'production') {
        // 生产环节输出数据库运行状态
        setInterval( () => { connectionPool._logStats() }, 60 * 1000)
      }
    }
    return await connectionPool.getConnection()
  }
}