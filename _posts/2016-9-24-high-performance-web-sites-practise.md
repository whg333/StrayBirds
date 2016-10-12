---
layout: post
title: 雅虎前端优化14条军规实践
description: "雅虎前端优化14条军规实践"
category: [技术]
tags: [大型网站技术架构]
comments: true
---

## 14条让网站加速的“黄金法则”
赫赫有名的雅虎前端优化14条军规其实早在2007年就被雅虎首席性能工程师Steve Souders总结成书并由著名的计算机书籍出版商O'Reilly出版——[《High Performance Web Sites》](https://www.amazon.com/dp/0596529309?tag=stevsoud-20&camp=14573&creative=327641&linkCode=as1&creativeASIN=0596529309&adid=00GNM1ZWW77KSD0RERXN&)（中译版[《高性能网站建设指南》](https://book.douban.com/subject/3132277/)则是在2008年由电子工业出版社出版），这里记录下自己在真实的线上项目中如何根据情况去实施这些军规，即作为个人总结也作抛砖引玉之用

![book](http://cejdh.img48.wal8.com/img48/533449_20151202165458/147629857666.png)

该书揭露了Web前端加载缓慢的罪魁祸首是**浏览器对HTML文件内Web组件的下载与解析**：即浏览器对Web站点的HTML文件进行HTTP请求后（无缓存情况下），服务器响应HTML文件的时间只占总响应时间的10%~20%，而其余的80%~90%响应等待时间则花费在对HTML文件内Web组件的下载（HTTP请求）和解析（JavaScrip、CSS、图片的下载以及DOM的解析生成等）！

即所谓的**网站性能黄金法则**：

>只有10%~20%的最终用户响应时间花在了下载HTML文档上，其余的80%~90%时间花在了下载和解析页面中的所有组件上

所以，请先不遗余力的去**优化前端（减少那80%~90%的组件下载解析时间）**，更主要的是这14条军规的实施相较**优化后端（重构代码架构或者数据库结构）**来说更简单，而且都是经过多年和许多网站实践验证可行的，实施后立竿见影和事半功倍！

## 项目简介和14条军规的实践
### 项目简介
我们的项目是一款经营模拟类的H5游戏——[《QQ花藤》](https://h5.qzone.qq.com/mqzone/jsp?starttime=1476299936000&hostuin=174708164#174708164/playbar/detail?appid=1105477665)，即使不是传统的Web互联网网站，但是H5游戏本质上也还是网页游戏，即通过JavaScript脚本在浏览器中运行的游戏。其实只要本质上是涉及到浏览器访问Web页面，且需要下载和解析Web页面内的组件，那这14条网站加速的“黄金法则”都是适用的！

![game](http://cejdh.img48.wal8.com/img48/533449_20151202165458/147630047064.png)

下面就针对这14条军规在项目中的实践做下阐述和总结

### 规则1：减少HTTP请求
这是最最重要的一条！根据前面提到的**网站性能黄金法则**我们知道，网页80%~90%的响应时间都花费在浏览器下载和解析Web页面组件了，所以减少Web组件的数量以此来减少浏览器进行HTTP请求下载和解析的工作量，会让浏览器更迅速的打开Web页面

在我们的H5游戏项目中，减少HTTP请求这个规则主要针对的是图片资源的合并和JavaScript脚本代码的合并，即使用图片合成工具，将一些零碎的小图合成一张大图——雪碧图，如此一来只需要一次HTTP请求即可

![pic01](http://cejdh.img48.wal8.com/img48/533449_20151202165458/147630047154.png)

而针对JavaScript脚本的合并，因为目前H5游戏前端无论哪个流行框架（[Cocos2d-JS](http://www.cocos.com/)、[白鹭](http://www.egret.com/)或者[LayaBox](http://layabox.com/)），都会集成发布H5游戏页面index.html的功能，其中就会把开发者们编写的JavaScript（即使真正开发者使用的不是原生的JavaScript语言，例如C++、TypeScript或者ActionScript，也能自动转换为JavaScript代码）代码压缩合并成app.min.js（注意下面截图为app.max.js只是名字为max而且，其实代码是已经经过压缩和精简后的），同样也只需要一次HTTP请求就能获取所有前端业务逻辑的源代码了

![pic02](http://cejdh.img48.wal8.com/img48/533449_20151202165458/147630069905.png)

在H5游戏项目上线后，我们前后端一起监控查看进入游戏的HTTP请求细节，详细分析可以针对哪些个HTTP请求进行延后请求或直接合并成为一条HTTP请求内容中，在这个优化过程中减少了20+左右的HTTP请求

### 规则2：使用CDN（内容分发网络）

### 规则3：添加Expires（缓存过期）头

### 规则4：压缩（Gzip）组件

### 规则5：将CSS样式表放在顶部

### 规则6：将JavaScript脚本放在底部

### 规则7：避免CSS表达式

### 规则8：使用外部JavaScript和CSS

### 规则9：减少CDN查找

### 规则10：精简JavaScript

### 规则11：避免重定向

### 规则12：移除重复JavaScript脚本

### 规则13：可选择的配置ETag

### 规则14：可选择缓存Ajax请求

## 参考
* [《高性能网站建设指南》书评](http://www.cnblogs.com/georgewing/archive/2009/09/14/1566558.html)
* [Best Practices for Speeding Up Your Web Site](https://developer.yahoo.com/performance/rules.html)

（未完待续。。。）