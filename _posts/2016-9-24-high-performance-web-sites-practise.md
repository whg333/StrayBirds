---
layout: post
title: 雅虎前端优化14条军规实践
description: "雅虎前端优化14条军规实践"
category: [技术]
tags: [大型网站技术架构]
comments: true
---

## [《高性能网站建设指南》](https://book.douban.com/subject/3132277/)
赫赫有名的雅虎前端优化14条军规其实早在2007年就被雅虎首席性能工程师Steve Souders总结成书并由著名的计算机书籍出版商O'Reilly出版——**[《High Performance Web Sites》](https://www.amazon.com/dp/0596529309?tag=stevsoud-20&camp=14573&creative=327641&linkCode=as1&creativeASIN=0596529309&adid=00GNM1ZWW77KSD0RERXN&)**（中译版**[《高性能网站建设指南》](https://book.douban.com/subject/3132277/)**则是在2008年由电子工业出版社出版），这里记录下自己在真实的线上项目中如何根据情况去实施这些军规，即作为个人总结也作抛砖引玉之用

![book](http://img10.360buyimg.com/n1/jfs/t1108/296/963065181/329393/3491fde4/5559c211N8db85f8e.jpg)

该书揭露了Web前端加载缓慢的罪魁祸首是**浏览器对HTML文件内Web组件的下载与解析**：即浏览器对Web站点的HTML文件进行HTTP请求后（无缓存情况下），服务器响应HTML文件的时间只占总响应时间的10%~20%，而其余的80%~90%响应等待时间则花费在对HTML文件内Web组件的下载与解析（JavaScrip、CSS、图片的下载以及DOM的解析生成等）！

即所谓的网站性能优化指导黄金法则：

>只有10%~20%的最终用户响应时间花在了下载HTML文档上，其余的80%~90%时间花在了下载页面中的所有组件上

所以，请先不遗余力的去**优化前端（减少那80%~90%的组件下载解析时间）**，更主要的是这14条军规的实施相较**优化后端（重构代码架构或者数据库结构）**来说更简单，而且都是经过多年和许多网站实践验证可行的，实施后立竿见影和事半功倍！

## 项目简介和14条军规的实践

下面就针对这14条军规在项目中的实践做下阐述和总结

### 规则1：减少HTTP请求

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