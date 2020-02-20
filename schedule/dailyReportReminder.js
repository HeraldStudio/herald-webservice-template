const schedule = require('node-schedule')
const { config } = require('../app')
const axios = require('axios')
const oracle = require('../database/oracle.js')

// 每天下午三点
// 0 0 15 * * *
// */5 * * * *
const job = schedule.scheduleJob('0 0 14 * * *',async function () {
  setTimeout(async () => {
    const db = await oracle.getConnection()
    try{
      // 获取推送名单列表
      const today = moment().format('YYYY-MM-DD')
      const pushList = await db.execute(/*sql*/`
       SELECT 
       NOREPORT.CARDNUM CARDNUM,
       XSC_OPENID.OPENID OPENID
       FROM (
            (
              (
                (SELECT XH CARDNUM FROM T_BZKS_TMP)
                MINUS
                (SELECT CARDNUM FROM XSC_NCP_DAILY  WHERE  to_char(CREATED_DATE, 'YYYY-MM-DD') =: today)
              )
              MINUS
              (SELECT CARDNUM FROM XSC_WECHAT_PUSH WHERE to_char(START_TIME, 'YYYY-MM-DD') =: today AND PUSH_TYPE = 'dailyReportReminder-student' AND (HAS_STARTED = 1 OR HAS_FINISHED = 1))
            ) NOREPORT
            LEFT JOIN
            XSC_OPENID
            ON  NOREPORT.CARDNUM = XSC_OPENID.CARDNUM
        ) WHERE XSC_OPENID.OPENID is not null
      `,{today})


      // pushList.rows = [
      //   ['213171610','opTCCt0VHpSaIvoL4Zy6Me9tkJYk'],
      //   ['213183580','opTCCtxx_TXgFXvrZR7TuBJIB8dc'],
      //   ['213162317','opTCCt2R1mem7q3W6GXipJPoh41I'],
      //   ['213181432','opTCCtxWJWVW-TYuaOmhnI55uC7g'],
      //   ['213172816','opTCCt2oYH3YuHzS1boTh9EeChQk'],
      //   ['213192688','opTCCtx4jFuqWBxnNmPmzTHTSFOE']
      // ]
      

      let accessToken = {}
      console.log(chalkColored.blue(`推送任务开始`))
      for(let student of pushList.rows){
        // console.log(student)
        // 检查accessToken是否过期/不存在的话重新获取
        if (!accessToken.expires_time || (moment().unix() > accessToken.expires_time)){
          try{
            // 获取accessToken 
            const res = await axios.get(`${config.accessKey.url}?appid=${config.accessKey.casWeAppId}&secret=${config.accessKey.casWeAppSecret}`)
            accessToken.access_token = res.data.access_token
            accessToken.expires_time = moment().unix() + res.data.expires_in
          }catch(err){
            // 如果到这里就完蛋了
            console.log('access_token失效，重新获取失败')
            continue
          }
        }
        
        // 自建唯一的id，类型+时间+一卡通号
        const id = 'dailyReportReminder-student' + moment().format('YYYY-MM-DD') + student[0]  

        // 先插入开始的记录唯一的ID，如果插入失败了，就说明该用户已经/正在推送
        try{
          await db.execute(/*sql*/`
          INSERT INTO XSC_WECHAT_PUSH 
          (ID, PUSH_TYPE, HAS_STARTED, HAS_FINISHED, CARDNUM, OPENID)
          VALUES(:id, :pushType, :hasStarted, :hasFinish, :cardnum, :openid)
          `,
          {
            id,
            pushType: 'dailyReportReminder-student',
            hasStarted: 1,
            hasFinish: 0,
            cardnum: student[0],
            openid: student[1]
          })
        }catch(err){
          console.log(chalkColored.yellow(`${student[0]} 该用户正在被执行或已经完成`))
          continue
        }
        
  
        // 推送消息
        const message = {
          "touser":`${student[1]}`,
          "template_id":"YOldeUODxW3fx3zkpj-1bYUrTG_mYTLuYHN78P6U3Qc",
          "url":"https://xgbxscwx.seu.edu.cn/#/mobile/ncp-daily-report",          
          "data":{
            "first": {
              "value":`${moment().format('ll')} 未填写每日健康情况提醒`,
              "color":"#173177"
            },
            "keyword1":{
              "value":"东南大学",
              "color":"#173177"
            },
            "keyword2": {
              "value":"东南大学学生处",
              "color":"#173177"
            },
            "keyword3": {
              "value":`${moment().format('YYYY-MM-DD HH:mm:ss')}`,
              "color":"#173177"
            },
            "keyword4": {
              "value":"今日健康情况尚未填写，请尽快填写",
              "color":"#173177"
            },
            "remark":{
              "value":"点击该消息前往填写",
              "color":"#173177"
            }
          }
        }
        const messageUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken.access_token}`
        let res = await axios.post(messageUrl, message)
        
        // 检查推送状态
        if(res.data.errmsg === 'ok'){
          // 推送成功, 更改数据记录 HAS_FINISHED = 1
          await db.execute(/*sql*/`
            UPDATE XSC_WECHAT_PUSH 
            SET HAS_FINISHED = :hasFinish
            WHERE ID = :id
            `,
          {
            hasFinish: 1,
            id
          })
          console.log(chalkColored.green(`${student[0]} 推送成功`))
        }else{
          // 推送失败, 更改数据记录 HAS_STARTED = 0
          await db.execute(/*sql*/`
            UPDATE XSC_WECHAT_PUSH 
            SET HAS_STARTED = :hasStarted
            WHERE ID = :id
            `,
          {
            hasStarted: 0,
            id

          })
          console.log(chalkColored.red(`${student[0]} 微信推送失败`))
        }
       
        
      
      }

    }catch(err){
      console.log('执行推送任务错误')
      console.log(err)
    }finally{
      console.log(chalkColored.blue(`推送任务结束`))
      await db.close()
    }



  }, (Math.random() + 1) * 3 * 1000)
})

module.exports = { job }