const cache = require('./redis');
const moment = require('moment');
const reqLimitPerWindowTime = 5; // times
const windowTime = 10; // seconds
const expireTime = 1000;

//此演算法會有邊際暴增流量問題，最大會有兩倍
const fixedWindowCounter = async (req, res, next) => {
  const userIp = req.ip;
  const key = `FWC:IP:${userIp}`;

  const numOfReq = await cache.incr(key);
  console.log('numOfReq : ', numOfReq);

  if (numOfReq <= reqLimitPerWindowTime) {
    cache.expire(key, windowTime, 'NX');
    console.log(key);
    return next();
  }

  console.log(key);
  return res.status(429).json({ error: 'Request too much' });
};

const slidingWindowCounter = async (req, res, next) => {
  const userIp = req.ip;
  const currentTime = moment().valueOf();
  const lessThanTime = moment().subtract(windowTime, 'second').valueOf();
  const key = `SWL:IP:${userIp}`;
};

// 此演算法的限流非常精確，但會浪費過多記憶體
const slidingWindowLogs = async (req, res, next) => {
  const userIp = req.ip;
  const currentTime = moment().valueOf();
  const lessThanTime = moment().subtract(windowTime, 'second').valueOf();
  const key = `SWL:IP:${userIp}`;

  const luaScript = `
  local key = KEYS[1]
  local currentTime = tonumber(ARGV[1])
  local lessThanTime = tonumber(ARGV[2])
  local reqLimitPerWindowTime = tonumber(ARGV[3])
  local windowTime = tonumber(ARGV[4])
  local unique = tonumber(ARGV[5])
  local clearBefore = currentTime - lessThanTime

  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
  local amount = redis.call('ZCARD', key)
  if amount <= reqLimitPerWindowTime then
  redis.call('ZADD', key, currentTime, unique)
  end
  redis.call('EXPIRE', key, windowTime)
  return reqLimitPerWindowTime - amount`;

  // sorted set 其中的member需要unique，因此借用random數字當作unique
  // eval只接受string參數！！！！！！
  const result = await cache.eval(luaScript, {
    keys: [key],
    arguments: [
      currentTime.toString(),
      lessThanTime.toString(),
      reqLimitPerWindowTime.toString(),
      windowTime.toString(),
      (Math.random() * 1000).toString(),
    ],
  });

  if (result <= 0) {
    return res.status(429).json({ error: 'Request too much' });
  }

  next();
};

// 這邊會有race condition, 用for loop去打的時候，都只會get到空的cacheData
const fail = async (req, res, next) => {
  const userIp = req.ip;
  const currentTime = moment().valueOf();
  const lessThanTime = moment().subtract(windowTime, 'second').valueOf();
  const key = `SWC:IP:${userIp}`;

  const cacheData = JSON.parse(await cache.get(key));

  if (!cacheData) {
    let data = [];
    let requestData = {
      requestTime: currentTime,
      counter: 1,
    };
    data.push(requestData);
    await cache.set(key, JSON.stringify(data), { EX: expireTime });
    return next();
  }
  // console.log(cacheData);

  let requestCount = cacheData.filter((item) => {
    return item.requestTime > lessThanTime;
  });
  console.log(requestCount);
  let countSum = 0;
  requestCount.forEach((item) => {
    countSum = countSum + item.counter;
  });
  console.log('countSum:', countSum);
  if (countSum >= reqLimitPerWindowTime) {
    return res.status(429).json({ error: 'Request too much' });
  }

  let isFound = false;
  cacheData.forEach((element) => {
    if (element.requestTime == currentTime) {
      isFound = true;
      element.counter++;
    }
  });

  if (!isFound) {
    cacheData.push({
      requestTime: currentTime,
      counter: 1,
    });
  }
  await cache.set(key, JSON.stringify(cacheData), { EX: expireTime });
  next();
};

module.exports = { fixedWindowCounter, slidingWindowCounter, slidingWindowLogs };
