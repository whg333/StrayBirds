---
layout: post
title: Java Web项目中的动态log4j日志
description: "Java Web项目中的动态log4j日志"
category: [Java]
tags: [log4j, Java]
comments: true
---

## 静态的log4j.properties配置文件
一般Java Web项目中我们都配置log4j.properties文件并配合使用slf4j的Logger接口（[出于简洁性和性能不建议使用log4j的Logger接口](https://www.oschina.net/translate/why-use-sl4j-over-log4j-for-logging)）来记录日志，常用的日志级别优先级从高到低分别是ERROR、WARN、INFO、DEBUG；而通常为了减少服务器输出过多日志导致的性能损耗，一般线上配置的日志级别都是为WARN或者ERROR，例如常见的log4j.properties配置如下：

```java
#please use the Log4jProperties.java instead.
#because the Log4jProperties.java support java code to change log4j configuration.

#Global logging configuration
log4j.rootLogger=WARN, stdout

log4j.logger.com.whg=WARN
log4j.logger.com.whg.test.bo.battle=WARN
log4j.logger.com.whg.keyvalue=DEBUG
log4j.logger.com.whg.exception.ExceptionHandler=DEBUG
log4j.logger.com.whg.test.bo.audit.BlackList=WARN
log4j.logger.com.whg.test.job=WARN

log4j.appender.empty=org.apache.log4j.varia.NullAppender

#Standard Output
log4j.appender.stdout=org.apache.log4j.ConsoleAppender
log4j.appender.stdout.layout=org.apache.log4j.PatternLayout
log4j.appender.stdout.layout.ConversionPattern=[%d{yyyy-MM-dd HH:mm:ss}] [%5p] [%c{1}:%L] [%m]%n

#File Output
log4j.appender.fileout=org.apache.log4j.RollingFileAppender
log4j.appender.fileout.File=${catalina.home}/logs/test/fileout.log
log4j.appender.fileout.MaxFileSize=10000KB
log4j.appender.fileout.layout=org.apache.log4j.PatternLayout
log4j.appender.fileout.layout.ConversionPattern=[%d{yyyy-MM-dd HH:mm:ss}] [%5p] [%c{1}:%L] [%m]%n

#MyBatis logging configuration... TRACE for All Sql Details, DEBUG Just for Sql Input
#log4j.logger.com.whg.test.repo.mappers=DEBUG
```

## 动态的log4j代码配置
但使用log4j.properties比较不方便的地方是：当服务器出现问题的时候，我们需要把log4j.properties的日志级别从较高的WARN或者ERROR修改为较低的INFO或者DEBUG（当然Logger接口的日志调用已经存在于代码中了），然后重启服务器令之前对log4j.properties的修改生效。

这里比较费劲的是必须重启服务器这一步，往往会耽误些许时间，所以要是在变更日志级别后不重启服务器就立即生效就方便多了！

### log4j整合Spring4定时检测生效
如果你的[log4j整合了Spring4](http://blog.csdn.net/tiger119/article/details/7432364)的话，其实Spring4的Log4jConfigListener可配置参数来定时检测log4j.properties文件是否发生变化并生效的功能

**此方法在spring4.x的版本中都可以使用,但在Spring 4.2.1中已经将其标记为过时了.如果使用spring4.2.1以上的版本又会造成不兼容**

```java
<context-param>
    <param-name>log4jConfigLocation</param-name>
    <param-value>classpath:log4j.properties</param-value>
</context-param>

<!-- Spring刷新Log4j配置文件变动的间隔,单位为毫秒 -->
<context-param>   
    <param-name>log4jRefreshInterval</param-name>   
    <param-value>10000</param-value>   
</context-param>

<listener>   
    <listener-class>org.springframework.web.util.Log4jConfigListener</listener-class>   
</listener>
<listener>
	<listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
</listener>
```

### log4j的PropertyConfigurator定时检测生效
如果上面所述的由于Spring4版本问题而不管用的话，我们还可以定义自己的类来使用org.apache.log4j.PropertyConfigurator类来实现定时检测log4j.properties。

如果整合了Spring的话，可以把这个类定义为bean交由Spring进行单例管理:

```java
<!--配置log4j自动加载日志-->  
<bean class="com.whg.test.web.util.Log4jConfig">  
    <constructor-arg name="reload" value="true"/>  
    <constructor-arg name="interval" value="60000"/>  
</bean> 
```

```java
import org.apache.log4j.PropertyConfigurator;  
import org.slf4j.Logger;  
import org.slf4j.LoggerFactory;  
  
public class Log4jConfig {  
	
	private static final Logger logger = LoggerFactory.getLogger(Log4jConfig.class);
	
    private final boolean reload;
    private final int interval;
  
    /** 
     * log4j日志自动加载 
     * 
     * @param reload   是否开启自动加载 
     * @param interval 自动加载时间(ms) 
     */  
    public Log4jConfig(boolean reload, int interval) {  
        this.reload = reload;  
        this.interval = interval;  
        this.loadConfig();  
    }  
  
    public void loadConfig() {  
        String log4jPath = Log4jConfig.class.getClassLoader().getResource("log4j.properties").getPath();  
        logger.info("log4j file path: " + log4jPath);  
  
        if(!reload){
        	PropertyConfigurator.configureAndWatch(log4jPath);
        }else{
        	// 间隔特定时间，检测文件是否修改，自动重新读取配置  
            PropertyConfigurator.configureAndWatch(log4jPath, interval); 
        }
    }  
}  
```

如果没有整合Spring的话，则自己在服务器启动的时候初始化即可，例如如果你有初始化Servlet就可以放到里面:

```java
<!-- 载入静态数据   -->
<servlet>
	<servlet-name>LoadStaticDataServlet</servlet-name>
	<servlet-class>com.whg.test.web.util.LoadStaticDataServlet</servlet-class>
	<load-on-startup>0</load-on-startup>
</servlet>
```

然后对应的LoadStaticDataServlet形如：

```java
@SuppressWarnings("serial")
public class LoadStaticDataServlet extends HttpServlet {

	@Override
    public void init() throws ServletException {
        String contextPath = getServletContext().getRealPath("/");
        ApplicationContext ac = WebApplicationContextUtils.getRequiredWebApplicationContext(getServletContext());
        Log4jConfig log4jConfig = new Log4jConfig(true, 60000);
    }
}
```

### 通过JSP代码修改log4j配置立即生效
上面提到2种动态方案都有一个缺点：即需要启动一个定时任务线程去检测log4j.properties文件是否变化，且定时任务的生效会有延时（例如修改日志级别后需要等待线程的下一次轮询检测到之后才能生效）；而对我们来说，如果在日志级别修改后能立即生效那肯定是最好的！于是乎有了最后介绍的这种方案——通过JSP代码修改log4j配置立即生效

首先我们有一个控制全局log4j日志级别的静态变量：

```java
public class Constant {

	public static String LOG_LEVEL = "WARN";

	static {
        try {
            Properties p = new Properties();
            loadPlatformProperties(p);
            loadDBProperties(p);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

	public static void loadPlatformProperties(Properties p) throws IOException{
		//本地测试环境则日志级别为INFO否则为WARN
		LOG_LEVEL = isLocalPlatform() ? "INFO" : "WARN";
	}
}
```

然后我们还有一个Java类来专门重载生效修改后的日志级别：

```java
public class Log4jProperties {
	
	public static void init(){
		Properties pro = new Properties();
		
		//Global logging configuration
		pro.put("log4j.rootLogger", Constant.LOG_LEVEL+", stdout");

		pro.put("log4j.logger.com.hoolai", Constant.LOG_LEVEL);
		pro.put("log4j.logger.com.hoolai.huaTeng.bo.battle", Constant.LOG_LEVEL);
		pro.put("log4j.logger.com.hoolai.keyvalue", "DEBUG");
		pro.put("log4j.logger.com.hoolai.exception.ExceptionHandler", "DEBUG");
		pro.put("log4j.logger.com.hoolai.huaTeng.bo.audit.BlackList", "INFO");
		pro.put("log4j.logger.com.hoolai.huaTeng.job", "INFO");

		pro.put("log4j.appender.empty", "org.apache.log4j.varia.NullAppender");

		//Standard Output
		pro.put("log4j.appender.stdout", "org.apache.log4j.ConsoleAppender");
		pro.put("log4j.appender.stdout.layout", "org.apache.log4j.PatternLayout");
		pro.put("log4j.appender.stdout.layout.ConversionPattern", "[%d{yyyy-MM-dd HH:mm:ss}] [%5p] [%c{1}:%L] [%m]%n");

		//File Output
		pro.put("log4j.appender.fileout", "org.apache.log4j.RollingFileAppender");
		pro.put("log4j.appender.fileout.File", "${catalina.home}/logs/huaTeng/fileout.log");
		pro.put("log4j.appender.fileout.MaxFileSize", "10000KB");
		pro.put("log4j.appender.fileout.layout", "org.apache.log4j.PatternLayout");
		pro.put("log4j.appender.fileout.layout.ConversionPattern", "[%d{yyyy-MM-dd HH:mm:ss}] [%5p] [%c{1}:%L] [%m]%n");

		PropertyConfigurator.configure(pro);
	}
	
}
```

最后就是能被调用的JSP:

```java
<%@ page language="java" contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<%@page import="com.whg.test.util.Log4jProperties"%>
<%@page import="com.whg.test.util.Constant"%>
<%
String levelStr = request.getParameter("level");
if(levelStr == null || levelStr.trim().length() == 0){
	out.print("未传入level参数<br/>");
	out.print("直接读取："+Constant.LOG_LEVEL+"<br/>");
	return;
}

out.print("直接读取："+Constant.LOG_LEVEL+"<br/>");
java.lang.reflect.Field logLevelField = Constant.class.getDeclaredField("LOG_LEVEL");
String level = logLevelField.get(Constant.class).toString();
out.print("修改前："+level+"<br/>");
logLevelField.set(Constant.class, levelStr);
level = logLevelField.get(Constant.class).toString();
out.print("修改后："+level+"<br/>");

//修改日志级别后需要重载生效
Log4jProperties.init();
```

当需要修改log4j日志级别时，只需要调用上面的那个JSP并传入对应的日志级别level参数即可，不需要重启服务器且能立即生效。

## 参考
* [配置log4j日志动态加载（不重启服务）](http://blog.csdn.net/lk_blog/article/details/50618471)
* [更改log4j日志级别而不重启服务器](http://blog.csdn.net/jianglinghao123/article/details/50475075)

（完）