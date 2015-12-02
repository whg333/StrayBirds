---
layout: post
title: jekyll最新版3.0.1安装与问题解决
description: "jekyll最新版3.0.1安装与问题解决"
category: 技术
tags: [github, jekyll]
comments: true
---

## GitHub+jekyll搭建个人博客
先根据[《创建GitHub技术博客全攻略》](http://blog.csdn.net/renfufei/article/details/37725057/)去做一些前期GitHub上的测试准备工作，然后再根据[《使用 GitHub, Jekyll 打造自己的免费独立博客》](http://blog.csdn.net/on_1y/article/details/19259435)这篇文章直接fork了该博主的[StrayBirds](https://github.com/minixalpha/StrayBirds/tree/gh-pages)项目来快速搭建了自己的博客

虽说可以直接在_post目录下编写博客文章，但是如果每次都使用GitHub在线编辑md(markdown)文件，然后查看生成的html，不行再去修改的话，效率太低，且又是由于网络原因，导致在线编辑md文件延时缓慢，所以最好还是执行如下图所示维护流程：
![jekyll_flow](http://www.pchou.info/assets/img/build-github-blog-page-01-img0.png)

即先在本地写完md文件，然后本地编译预览，没问题后使用git push上去即可

本人使用Eclipse的git插件去push修改的，虽说Eclipse（JEE的Mars版）对于md也有预览html功能，但是好像不是太完美（尤其是对嵌入java代码的浏览有问题）：
![eclipse_md](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144906092208.png)

所以Win7系统下直接使用[《认识与入门 Markdown》](http://sspai.com/25137)这篇文章推荐的[MarkdownPad2](http://www.markdownpad.com/)编辑器：
![MarkdownPad2_md](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144906092225.png)

下面就把在本地搭建**jekyll最新版3.0.1**的过程说一下

## 安装Ruby和DevKit
首先是Ruby和DevKit的安装，因为使用的是Win7系统，所以使用RubyInstaller安装的Ruby和Devkit，都在[这里](http://rubyinstaller.org/downloads/)下载

使用的是该页面的推荐Ruby 2.1.X，即Ruby 2.1.7版本，然后对应的DevKit使用DevKit-mingw64-32-4.7.2-20130224-1151-sfx.exe这个

首先安装Ruby 2.1.7，在Win7下直接Next比较简单，注意勾选上添加Ruby进系统Path以及管理rb后缀名为Ruby文件，安装好了以后就可以在命令行使用ruby命令了

然后DevKit其实是使用7-Zip提取文件，然后cd到你指定的提取文件的存放目录，使用

>ruby dk.rb init

和

>ruby dk.rb install

安装完毕DevKit，这个时候gem命令也可以使用了

## 安装和启动jekyll
接下来就是使用
>gem install jekyll

来安装jekyll了，但是如果出现网络异常等错误的话，那就需要重新设置一下RubyGems源为[淘宝网镜像地址](https://ruby.taobao.org/)了：
![RubyGems_Net_Error1](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144904868259.jpg)

![RubyGems_Net_Error2](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144904904153.jpg)

![RubyGems_taobao](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144904904138.png)

确保正确安装jekyll后可使用如下命令启动jekyll
>jekyll serve --safe --watch

但可能会遇到这几个问题：

### 1、启动jekyll的警告
因为安装jekyll时没有指定版本，所以默认安装最新版，例如我安装的是3.0.1版本的
![jekyll_3.0.1](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144904873329.jpg)

因为是最新版本，所以其jekyll的_config.yml配置文件的选项名字有变化，这个时候jekyll会报警告，提示过期了让你更新配置名字：
![jekyll_warm1](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144904873338.jpg)

前2个过期（Deprecation）警告只需要根据提示把更新_config.yml里面的配置名字即可，但是下面还有1个警告：没有包含（include）jekyll-paginate进Gemfile里面，解决方案是添加配置名为gems且值为jekyll-paginate进配置文件里面：

![jekyll_warm2](http://cejdh.img46.wal8.com/img46/533449_20151202165458/14490494151.png)

### 2、启动jekyll依赖包错误
正如上面提到的，警告没有了以后，在启动的时候还会由于缺少一些组件依赖包而导致的启动报错，而且jekyll内部的一些功能也必须依赖于这些插件包，想正确启动并应用就必须安装上这些依赖包：

>gem install kramdown //markdown语言解析依赖包
>
>gem install pygments.rb //代码高亮依赖包
>
>gem install liquid //模板引擎依赖包

如上的依赖包是根据[采用Jekyll + github + pygments构建个人博客的最终说明](http://www.jianshu.com/p/609e1197754c)提到的来安装的，但其实还有一个jekyll支持的功能插件未被提及到——分页

### 3、jekyll分页不显示
注意如果使用如下命令来启动jekyll
>jekyll serve --safe --watch

并不会报分页依赖包错误。。。而是正常启动jekyll成功，但是分页功能没效果！具体原因本人也不明，也不知道是不是由于safe参数隐藏了该报错？

后来是使用了如下这个命令来启动jekyll才发现该问题的（trace参数也可以不加）
>jekyll serve --trace

最初是由于分页没效果，想找一个在页面打印其paginator关联值的方法，但没找到却找到了上面那条带trace参数的监控命令。。。

报错如下图所示：
![jekyll_page1](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905011657.jpg)

然后安装一下jekyll-paginate即可：
>gem install jekyll-paginate

![jekyll_page2](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905174735.jpg)

### 4、Win平台警告解决
上图还有最后一个警告：提示让把如下命令添加到Gemfile里面：
>gem 'wdm', '>= 0.1.0' if Gem.win_platform?

但其实由于对Ruby的不了解，连Gemfile的具体位置和作用都没搞明白，甚至还自己在该blog项目目录下创建了一个Gemfile文件，但还是不行。。。

后来根据第1条在配置文件_config.yml添加的gems配置名，猜测估计就是所谓的gems的依赖项，所以把wdm添加进去_config.yml后的gems配置变为：
>gems: ["jekyll-paginate", "wdm"]

然后再次尝试启动后发现报错：
![win_error1](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905704118.jpg)

然后同样安装一下wdm依赖包即可：
![win_error2](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905704134.jpg)

如此一来本地正常启动jekyll没有任何报错了：
![win_error3](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905704142.jpg)

### 5、中文目录资源地址不能访问
启动后测试分页功能以及编写博客文章等功能都是没有问题的：
![chinese_error1](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905732704.png)

但是还有一个问题是带有中文目录资源地址不能访问，这个问题在GitHub是没有的，只有在本地jekyll才会出现。。。例如点击上图博客文章《Java中的并发》，由于其分类是中文“技术”，然后访问报错：
![chinese_error2](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905808582.png)

解决方案参考了[Jekyll编译中文文件名的网页的本地预览问题。](http://www.oschina.net/question/1396651_132154?fromerr=2DiTgNyt)，就是对jekyll访问中文目录资源处理做了下UTF-8转码：
![chinese_error3](http://cejdh.img46.wal8.com/img46/533449_20151202165458/1449058142.jpg)

![chinese_error4](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144905859586.jpg)

如此一来本地jekyll也可以正常访问中文目录资源地址了：
![chinese_error5](http://cejdh.img46.wal8.com/img46/533449_20151202165458/14490580864.png)