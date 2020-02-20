const schedule = require('node-schedule')
const { config } = require('../app')
const axios = require('axios')
const oracle = require('../database/oracle.js')
// 每天下午五点
const job = schedule.scheduleJob('0 0 17 * * *',async function () {
  setTimeout(async () => {
    let db = await oracle.getConnection()
    try {
      let returns = []
      let number = 0
      const today = moment().format('YYYY-MM-DD')
      // 获取辅导员信息列表以及未审核数量
      let record = await db.execute(`
      SELECT CARDNUM, OPENID, COUNT
      FROM(
        SELECT B.CARDNUM, OPENID, COUNT
        FROM (
          SELECT CARDNUM, SUM(COUNT) COUNT
          FROM XSC_CLASS_BIND,(
            SELECT CLASS_ID,COUNT(XSC_CLASS_BIND.CARDNUM) COUNT
            FROM XSC_CLASS_BIND
            WHERE ROLE = 'STUDENT' AND CARDNUM IN(
              SELECT CARDNUM
              FROM XSC_NCP_DAILY
              WHERE DELETED = 0 AND REVIEWED = 0 AND to_char(CREATED_DATE,'YYYY-MM-DD') = :today
            )
              GROUP BY CLASS_ID
          )A
          WHERE XSC_CLASS_BIND.CLASS_ID = A.CLASS_ID AND ROLE = 'COUNSELOR'  AND CARDNUM NOT IN(
            SELECT CARDNUM 
            FROM XSC_WECHAT_PUSH
            WHERE to_char(START_TIME,'YYYY-MM-DD') = :today AND HAS_STARTED = 1 AND PUSH_TYPE='dailyReviewReminder-counselor'
          )
          GROUP BY CARDNUM
        )B
        LEFT JOIN XSC_OPENID
        ON B.CARDNUM = XSC_OPENID.CARDNUM
      )
      WHERE OPENID IS NOT NULL
      `, { today })
      // 测试用，对所有SUPER推送
      // record = await db.execute(`
      // SELECT CARDNUM, OPENID 
      // FROM XSC_OPENID 
      // WHERE CARDNUM IN(
      //   SELECT CARDNUM 
      //   FROM XSC_ROLES 
      //   WHERE ROLE = 'SUPER'
      // )
      // `)
      // console.log(record)
      for (let index = 0; index < record.rows.length; index++) {
        let [cardnum, openid, count] = record.rows[index]
        // 检查是否已经开始推送
        let check = await db.execute(`
      SELECT CARDNUM
      FROM XSC_WECHAT_PUSH
      WHERE to_char(START_TIME,'YYYY-MM-DD') = :today AND HAS_STARTED = 1 AND PUSH_TYPE='dailyReviewReminder-counselor' AND CARDNUM =:cardnum
      `, { today, cardnum })
        if (check.rows.length === 0) {
          const postJson = {
            touser: openid,
            template_id: 'lGS2xEkKQNT6kM3WJEe9KOU8OaRFurctQXSJ2AxOhkk',
            url: 'https://xgbxscwx.seu.edu.cn/#/ncp-unreviewed',
            data: {
              first: {
                value: '您有未处理的审核信息，请及时处理',
                color: '#173177',
              },
              keyword1: {
                value: '每日疫情上报',
                color: '#173177',
              },
              keyword2: {
                value: count,
                color: '#173177',
              },
              keyword3: {
                value: moment().format('lll'),
                color: '#173177',
              },
              remark: {
                value: '点击查看详情',
                color: '#173177',
              },
            }
          }
          // 获取access_token
          let access_token
          try {
            // 从 cas-we-can 获取信息
            let res = await axios.get(`https://xgbxscwx.seu.edu.cn/cas-we-can/access-token?appid=${config.accessKey.casWeAppId}&secret=${config.accessKey.casWeAppSecret}`)
            const data = res.data
            access_token = data.access_token
          } catch (err) {
            console.log(err)
            throw '获取 access_token 错误'
          }
          // 插入推送记录
          try {
            await db.execute(`
                INSERT INTO XSC_WECHAT_PUSH
                (PUSH_TYPE, HAS_STARTED, CARDNUM, OPENID)
                VALUES (:pushType, :hasStarted, :cardnum, :openid)
                `, {
              pushType: 'dailyReviewReminder-counselor',
              hasStarted: 1,
              cardnum,
              openid
            })
          } catch (err) {
            console.log(err)
            throw '建立新推送时，数据库错误'
          }
          // 开始推送
          try {
            const notificationURL = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${access_token}`
            const result = await axios.post(notificationURL, JSON.stringify(postJson))
            if (result.data.errcode) {
              returns.push({
                cardnum: cardnum,
                errcode: result.data.errcode,
                errmsg: result.data.errmsg
              })
            }
          } catch (err) {
            // 推送失败时，将记录标记为失败
            await db.execute(`
                UPDATE XSC_WECHAT_PUSH
                SET HAS_STARTED = 0
                WHERE OPENID = :openid AND HAS_STARTED = 1 AND HAS_FINISHED = 0 AND PUSH_TYPE='dailyReviewReminder-counselor'
                `, { openid })
            console.log(err)
            throw '推送消息错误'
          }
          // 推送成功时将记录标记为成功
          await db.execute(`
              UPDATE XSC_WECHAT_PUSH
              SET HAS_FINISHED = 1
              WHERE OPENID = :openid AND HAS_STARTED = 1 AND HAS_FINISHED = 0 AND PUSH_TYPE='dailyReviewReminder-counselor'
              `, { openid })
          number++
          console.log(cardnum + ': 推送成功，共'+count+'条未审核')
        }
      }
      if (returns.length === 0) {
        console.log(`共${number}条推送成功`)
      } else {
        console.log(returns)
      }
    } catch (err) {
      console.log(err)
      db.close()
    }
  }, (Math.random() + 1) * 3 * 1000)
})


module.exports = { job }