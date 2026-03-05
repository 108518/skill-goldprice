/**
 * 获取实时贵金属价格
 * 数据来源: https://i.jzj9999.com/quoteh5
 */

const { chromium } = require('playwright');

/**
 * 获取贵金属价格
 * @returns {Promise<Array>} 贵金属价格数组
 */
async function getGoldPrices() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log('正在访问融通金行情页面...');
    
    // 访问页面
    await page.goto('https://i.jzj9999.com/quoteh5', { 
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('等待价格数据加载...');
    
    // 等待价格数据加载
    await page.waitForSelector('.price-table-row', { timeout: 15000 });
    
    // 额外等待确保数据完全加载
    await page.waitForTimeout(2000);
    
    console.log('提取价格数据...');
    
    // 提取价格数据
    const prices = await page.evaluate(() => {
      const rows = document.querySelectorAll('.price-table-row');
      const result = [];
      
      rows.forEach(row => {
        const nameElement = row.querySelector('.symbol-name');
        const name = nameElement?.textContent?.trim();
        
        if (!name) return;
        
        // 获取回购价
        const bidPriceElement = row.querySelector('.el-col:nth-child(2) .symbole-price span');
        let bidPrice = bidPriceElement?.textContent?.trim() || '--';
        
        // 获取销售价
        const askPriceElement = row.querySelector('.el-col:nth-child(3) .symbole-price span');
        let askPrice = askPriceElement?.textContent?.trim() || '--';
        
        // 获取最高价和最低价
        const highElement = row.querySelector('.el-col:nth-child(4) .symbol-price-rise');
        let high = highElement?.textContent?.trim() || '--';
        
        const lowElement = row.querySelector('.el-col:nth-child(4) .symbol-price-fall');
        let low = lowElement?.textContent?.trim() || '--';
        
        // 判断涨跌
        const bidSpan = row.querySelector('.el-col:nth-child(2) .symbole-price span');
        const isBidFall = bidSpan?.classList.contains('symbol-price-fall');
        const isBidRise = bidSpan?.classList.contains('symbol-price-rise');
        
        const askSpan = row.querySelector('.el-col:nth-child(3) .symbole-price span');
        const isAskFall = askSpan?.classList.contains('symbol-price-fall');
        const isAskRise = askSpan?.classList.contains('symbol-price-rise');
        
        result.push({
          name,
          bidPrice,
          askPrice,
          high,
          low,
          bidTrend: isBidRise ? 'up' : (isBidFall ? 'down' : 'flat'),
          askTrend: isAskRise ? 'up' : (isAskFall ? 'down' : 'flat'),
          updateTime: new Date().toLocaleString('zh-CN', { 
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        });
      });
      
      return result;
    });
    
    return prices;
  } catch (error) {
    console.error('获取价格失败:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * 格式化输出价格信息
 * @param {Array} prices 价格数组
 */
function formatPrices(prices) {
  if (!prices || prices.length === 0) {
    return '未获取到价格数据';
  }
  
  const lines = [];
  lines.push('='.repeat(80));
  lines.push('贵金属实时价格');
  lines.push(`更新时间: ${prices[0]?.updateTime || new Date().toLocaleString('zh-CN')}`);
  lines.push('='.repeat(80));
  lines.push('');
  
  prices.forEach(item => {
    const bidTrendIcon = item.bidTrend === 'up' ? '↑' : (item.bidTrend === 'down' ? '↓' : '-');
    const askTrendIcon = item.askTrend === 'up' ? '↑' : (item.askTrend === 'down' ? '↓' : '-');
    
    lines.push(`品种: ${item.name}`);
    lines.push(`  回购价: ${item.bidPrice} ${bidTrendIcon}`);
    lines.push(`  销售价: ${item.askPrice} ${askTrendIcon}`);
    lines.push(`  高/低: ${item.high} / ${item.low}`);
    lines.push('');
  });
  
  lines.push('='.repeat(80));
  lines.push('说明: 以上行情仅供参考，价格仅适用于融通金公司自身贵金属业务');
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * 导出价格为JSON格式
 * @param {Array} prices 价格数组
 */
function exportToJSON(prices, filename = 'gold-prices.json') {
  const fs = require('fs');
  const data = {
    source: 'https://i.jzj9999.com/quoteh5',
    updateTime: new Date().toISOString(),
    prices: prices
  };
  
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`价格数据已导出到: ${filename}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('开始获取贵金属价格...\n');
    
    const prices = await getGoldPrices();
    
    if (prices && prices.length > 0) {
      // 格式化输出
      console.log(formatPrices(prices));
      
      // 导出为JSON
      exportToJSON(prices);
      
      // 输出JSON格式
      console.log('\nJSON格式:');
      console.log(JSON.stringify(prices, null, 2));
      
      return prices;
    } else {
      console.log('未获取到价格数据');
      return [];
    }
  } catch (error) {
    console.error('程序执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  getGoldPrices,
  formatPrices,
  exportToJSON
};
