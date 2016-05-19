---
layout: post
title: Cocos2d-JS/Ajax用Protobuf与NodeJS/Java通信
description: "Cocos2d-JS/Ajax用Protobuf与NodeJS/Java通信"
category: [JavaScript, Java]
tags: [Cocos2d-JS, Ajax, Protobuf, NodeJS, Java]
comments: true
---

## Google的Protobuf
Protobuf全称为“Protocol Buffers”，是Google开源出来的一个序列化协议并配备多种编程语言的实现（Java、C、C++、Python等，甚至JavaScript、ActionScript都有对应的实现），其本质是按照协议规范编写proto文件，该proto文件内容由若干个message消息体组成，而message消息体是由编程语言中常用的数据类型（int、long、String等）对应的Protobuf字段类型组合而成的，Protobuf的作用是可以帮你把定义好的message消息体按协议编码（Encode）转为二进制字节流（byte[]），反之亦可帮你把已编码的byte[]字节流再解码（Decode）还原回来。

### 操作步骤
举个Java的例子，你想使用Protobuf把Java中的对象转成byte[]的话，需要如下这几个步骤：

1. 根据Protobuf规范编写proto文件：该proto文件内需要定义一个与Java对象匹配的message消息体，该message消息体中的字段类型与Java对象的成员变量字段类型一一对应上
2. 利用Protobuf对应Java语言的protoc.exe生成工具去根据第1步定义的proto文件生成对应的Protobu编解码Java类
3. 使用第2步生成的Protobuf编解码Java类对Java对象做编解码的工作，例如编码Java对象为byte[]或者解码byte[]为Java对象

这里用Java代码举例（[GitHub上的代码在这里](https://github.com/whg333/protobuf-sample)）来解释说明前面介绍使用Protobuf的步骤：

1. 编写proto文件在其中定义message消息体，这里我们定义了一个名为StudentProto的消息体

```java
package tutorial;  
  
option java_package = "com.whg.protobuf";  
option java_outer_classname = "StudentProtoBuf";  
  
message StudentProto {  
  optional int64 id = 1;  
  optional int32 age = 2;  
  optional bool sex = 3; 
  optional string name = 4; 
}
```

2. 执行protoc.exe来生成对应的Protobu编解码Java类，这里写个名为exec-protoc.bat的脚本来执行protoc.exe

> protoc -I=../proto --java_out=../proto ../proto/*.proto
> 
> pause

其中**-I**代表Input输入proto文件的目录，而**--java_out**代表输出Java类的目录，最后的参数是一个通配符匹配输入proto文件的目录下的所有以.proto的文件，即达到批量生成Protobuf Java类的效果

3. 然后我们编写与message消息体对应的Java对象，例如这里的Student类对应的就是StudentProto消息体，注意字段名和类型一一对应上了，其实Java字段名可以不必与消息体名称一样，但这么写也算是一种约定吧，一目了然嘛

```java
public class Student {

	private long id;
	private int age;
	private boolean sex;
	private String name;
	
	public Student() {
		
	}

	public Student(StudentProto proto){
		id = proto.getId();
		age = proto.getAge();
		sex = proto.getSex();
		if(proto.hasName()){
			name = proto.getName();
		}
	}
	
	public byte[] toByteArray(){
		StudentProto.Builder builder = StudentProto.newBuilder();
		builder.setId(id);
		builder.setAge(age);
		builder.setSex(sex);
		if(name != null){
			builder.setName(name);
		}
		return builder.build().toByteArray();
	}
	
	public static Student parse(byte[] bytes){
		StudentProto proto = null;
		try {
			proto = StudentProto.parseFrom(bytes);
		} catch (InvalidProtocolBufferException ex) {
			throw new IllegalArgumentException(ex);
		}
		return new Student(proto);
	}

	//省略setter/getter方法

}
```

然后具体使用就像下面这样在byte[]和Java对象之间互相编解码转换了

```java
public static void main(String[] args) {
	Student student = new Student();
	student.setId(300);
	student.setAge(30);

	byte[] bytes = student.toByteArray();
	Parser.printHex(bytes);
	Parser.printInt(bytes);
	Parser.printBinary(bytes);

	Student student2 = Student.parse(bytes);
	System.out.println(student2.getId());
	System.out.println(student2.getAge());
}
```

有了Protobuf这个序列化byte[]编解码的利器，相较于文本协议的Xml和Json来说的话，相当于做了很大的压缩！所以无论是在需要序列化存储的场景，还是在网络序列化传输场景，Protobuf都不失为一个好抉择！

### 序列化传输
例如在网络传输的场景下，我们可以用Protobuf在发送端把Java对象编码为byte[]后发送出去，然后在接收端再用Protobuf解码（Decode）byte[]来还原成对应的Java对象供程序使用，这样就可以在网络传输方面极大的缩减网络流量了。

### 序列化存储
而在存储的场景下，无论是基于内存/磁盘/RMDB的存储，都能节约成本：

1. 内存——可以在使用Protobuf编码为byte[]后存储进memcached/redis中
2. 磁盘——同样可以用Protobuf编码为byte[]后存储成文件，需要存储多个byte[]则需要加入分隔符用于区分单个，类似网络传输中的成帧/解析
3. RMDB——形如MySql的RMDB，也都有支持byte[]二进制存储的Blob字段

### 总结与思考
总结一下，因为Protobuf已经message转换为二进制字节流byte[]了，而计算机对二进制字节流的操作最在行了，所以除了压缩节约成本外，其可用性也接近计算机底层处理的本质了：因为无论是什么东西在计算机内的表示都是字节（即8个二进制位）！字符串String可以转为byte[]、图片可以转为byte[]、任何东西想在计算机内表示都必须是byte[]！

## 前端使用Protobuf发送/接收二进制数据
前面提到过Protobuf网络传输的场景，这里我们就来看看：前端（Cocos2d-JS/Ajax）如何使用Protobuf与后端（NodeJS/Java）通信？由于Protobuf能把proto文件定义的消息体转换为二进制字节流（byte[]），所以问题就变成：前端（Cocos2d-JS/Ajax）如何使用二进制与后端（NodeJS/Java）通信？

网络通信一般分为2类：**短连接和长连接**。短连接一般说的是基于HTTP协议的请求/响应的连接；而长连接则是基于TCP/IP协议的3次握手不随意中断的连接；当然其实HTTP协议是基于TCP/IP协议的，只是请求/响应这种模式令其相较TCP/IP来说更“随意”中断了一点，但中断的后果是太浪费底层TCP/IP连接了，所以之后的HTTP1.1以及2.0为了减少浪费提出了Keep-Alive及多路复用等改进，甚至演化出了Html5的WebSocket协议这种基于HTTP协议升级版的全双通长连接，发展趋势轨迹：TCP/IP长连接 --> HTTP短连接 --> WebSocket长连接；这也令我想起后端服务器处理请求IO模型的进化轨迹：单线程 --> 多线程 --> 事件驱动单线程

下面根据这2个分类连接说说基于JavaScript的前端（Cocos2d-JS/Ajax）如何用Protobuf与后端（NodeJS/Java）通信

### 短连接——HTTP
无论是Cocos2d-JS还是Ajax，其进行HTTP通信都是基于JavaScript的XMLHttpRequest对象！所以只要搞清楚XMLHttpRequest对象如何与后端通信发送/接收二进制即可。使用如下几步来操作XMLHttpRequest发送Protobuf二进制数据：

#### 1. 获取XMLHttpRequest
Cocos2d-JS里就有XMLHttpRequest对象的支持，直接使用`cc.loader.getXMLHttpRequest()`即可获取到；而Ajax里面的XMLHttpRequest对象由于浏览器支持不同，可以使用如下代码获取

```java
function createXMLHttpRequest(){
    if(window.ActiveXObject){ //IE only
        return new ActiveXObject("Microsoft.XMLHTTP");
    }else if(window.XMLHttpRequest){ //others
        return new XMLHttpRequest();
    }
}
```

#### 2. 设置XMLHttpRequest头部支持Protobuf协议
无论是Cocos2d-JS还是Ajax，其XMLHttpRequest对象本质都一样，所以如下open（打开）url以及setRequestHeader（设置请求头部）等代码都是通用的

```java
var xhr = cc.loader.getXMLHttpRequest(); // or use createXMLHttpRequest() in Ajax 
xhr.open("POST", "http://localhost:3000/protobuf");

xhr.setRequestHeader("Content-Type","application/x-protobuf");
xhr.setRequestHeader("Accept","application/x-protobuf");

if (xhr.overrideMimeType){
    //这个是必须的，否则返回的是字符串，导致protobuf解码错误
    //具体见http://www.ruanyifeng.com/blog/2012/09/xmlhttprequest_level_2.html
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
}
```

#### 3. 前端使用[protobuf.js](https://github.com/dcodeIO/protobuf.js)来编解码Protobuf
[protobuf.js](https://github.com/dcodeIO/protobuf.js)是GitHub上使用JavaScript实现Protobuf Buffer协议编解码的项目，这里我们使用它来作为前端JavaScript编解码Protobuf的利器

##### 3.1 引入protobuf.js
这里引入的protobuf.js版本为5.0.1，其中主要使用到了long.js、bytebuffer.js和protobuf.js这3个JS文件，如果使用NodeJS的话，直接在`package.json`添加dependencies依赖配置
> "protobufjs": "~5.0.1"

然后使用
> npm install

即可完成对该依赖的下载，在node_modules文件夹下找到那3个JS文件拷贝到前端JS文件夹，然后在前端的index.html中引入protobuf.js

```java
<script src="../protobuf/long.js"></script>
<script src="../protobuf/bytebuffer.js"></script>
<script src="../protobuf/protobuf.js"></script>
<script>
    if (typeof dcodeIO === "undefined" || !dcodeIO.ProtoBuf) {
        throw(new Error("ProtoBuf.js is not present. Please see www/index.html for manual setup instructions."));
    }
</script>
```

#### 3.2 使用protobuf.js
引入protobuf.js后就可以在JS代码中使用protobuf.js了，我们这里用于测试的TestProtobuf.proto文件如下

```java
package TestProtobuf;

option java_package = "com.why.game.protobuf";
option java_outer_classname = "TestProtobuf";

message TestProto{
	optional int32 id = 1;
	optional string name = 2;
}
```

然后在JS中加载该TestProtobuf.proto文件，并把该proto文件中定义的TestProto消息体赋值为JS局部变量TestProto

```java
var ProtoBuf = dcodeIO.ProtoBuf,
    TestProtobuf = ProtoBuf.loadProtoFile("../protobuf/TestProtobuf.proto").build("TestProtobuf"),
    TestProto = TestProtobuf.TestProto;
```

如此一来我们就可以用TestProtobuf.proto文件中定义的消息体来发送/接收二进制了：发送的时候使用XMLHttpRequest对象的send方法发送经由TestProto编码（encode）后的buffer数组（本质也是二进制字节流），接收的时候同样使用TestProto解码（decode）接收到的二进制数据

```java
xhr.onreadystatechange = function(){
    if (xhr.readyState == 4 && xhr.status == 200) {
        var data = xhr.responseText;
        var protobufResp = TestProto.decode(str2bytes(data));
        var jsonResp = JSON.stringify(protobufResp);
        console.log(jsonResp);
    }
};

var testProto = new TestProto({
    id:10014,
    name:"testProtoName测试987"
});
xhr.send(testProto.toBuffer());
```

这里因为浏览器会把Ajax返回的二进制数据当做文本数据，所以写个str2bytes方法把接收到的文本数据按字节一个个做与运算来还原成二进制byte

```java
function str2bytes(str){
    var bytes = [];
    for (var i = 0, len = str.length; i < len; ++i) {
        var c = str.charCodeAt(i);
        var byte = c & 0xff;
        bytes.push(byte);
    }
    return bytes;
}
```

### 长连接——SocketIO/WebSocket
可以说整个互联网的普及依靠的是**浏览器和HTTP协议**这一最佳拍档的完美组合，老早前所说的上网冲浪就是打开浏览器，输入网页地址，然后等待浏览器渲染显示网页后阅览；但HTTP协议的一个短板就是不能即时刷新，即需要自己手动刷新页面，这也就是为什么贴吧/论坛有“F5已烂”这一说法，因为最新的信息不会自动呈现出来。

虽然到了Web2.0时代由于Ajax的应用这一短板的用户体验有了大幅度的改善，但Ajax的本质依旧还是基于HTTP协议的短连接只不过是浏览器异步加载完成的响应信息而已；甚至还有使用“轮询”机制模仿长连接即时性的做法（即定时的用Ajax“拉取”服务器的信息来更新页面），但由于HTTP短连接本质就不是一个真实的双通道全开的“稳定”的连接，所以其即时性方面无论如何蹩脚的去模拟总会有或多或少的不爽（例如实现起来费劲麻烦等）。

于是乎Html5的到来顺便携带了WebSocket：这一在HTTP协议基础上做出“升级”的“稳定”的长连接协议，其本质上是完全双通道全开，即服务器和客户端之间的通道随时可以进行互相推送消息。而SocketIO协议则是考虑到不是所有的浏览器都支持WebSocket，于是做了层WebSocket的封装，对于不支持WebSocket的浏览器其内部可能使用的是Ajax模拟的长连接。

因为SocketIO封装了WebSocket，所以其API接口和WebSocket大同小异。下面分别介绍使用SocketIO/WebSocket来整合Protobuf发送/接收二进制数据的步骤

#### 引入SocketIO客户端[socket.io-client](https://github.com/socketio/socket.io-client)
[socket.io-client](https://github.com/socketio/socket.io-client)是GitHub上使用JavaScript实现SocketIO协议的客户端，这里引入的socket.io-client版本为1.4.5，其中主要使用到了socket.io.js这个JS文件，如果使用NodeJS的话，直接在`package.json`添加dependencies依赖配置
> "socket.io" : "~1.4.5"

然后使用
> npm install

即可完成对该依赖的下载，在node_modules文件夹下找到那个JS文件拷贝到前端JS文件夹，然后在前端的index.html中引入socket.io.js

```java
<script type="text/javascript" src="static/js/lib/socket.io/socket.io.js"></script>
```

#### 使用SocketIO客户端
然后我们在JS代码中结合protobuf.js来使用socket.io.js来发送/接收二进制消息，这里的测试example.proto文件如下

```java
message Message {
    required string text = 1;
}
```

接着使用protobuf.js加载上面的example.proto文件，注意同前面的TestProtobuf.proto对比区别下有无`package`包声明其protobuf.js加载和构造消息体的不同之处

```java
var ProtoBuf = dcodeIO.ProtoBuf;
var Message = ProtoBuf.loadProtoFile("./example.proto").build("Message");

// Connect to our SocketIO server: node server.js
var socket = io.connect("http://localhost:3000");

socket.on("connection", function () {
    log.value += "Connected\n";
});

socket.on("disconnect", function () {
    log.value += "Disconnected\n";
});

socket.on("message", function (message) {
    try{
        var msg = Message.decode(message);
        log.value += "Received: " + msg.text + "\n";
    }catch(err){
        log.value += "Error: " + err + "\n";
    }
});

function send() {
    if (socket.connected) {
        var msg = new Message(text.value);
        socket.send(msg.toBuffer());
        log.value += "Sent: " + msg.text + "\n";
    } else {
        log.value += "Not connected\n";
    }
}

```

#### 使用WebSocket
下面使用Html5 WebSocket API重写上面SocketIO发送/接收Protobuf二进制的例子，可以看到其实是大同小异的，除了协议不是HTTP而是WebSocket，其API基本类似

```java
// Connect to our server: node server.js
var socket = new WebSocket("ws://localhost:8080/ws");
socket.binaryType = "arraybuffer"; // We are talking binary

socket.onopen = function() {
    log.value += "Connected\n";
};

socket.onclose = function() {
    log.value += "Disconnected\n";
};
    
socket.onmessage = function(evt) {
    try {
        var msg = Message.decode(evt.data);
        log.value += "Received: "+msg.text+"\n";
    } catch (err) {
        log.value += "Error: "+err+"\n";
    }
};

function send() {
    if (socket.readyState == WebSocket.OPEN) {
        var msg = new Message(text.value);
        socket.send(msg.toBuffer());
        log.value += "Sent: "+msg.text+"\n";
    } else {
        log.value += "Not connected\n";
    }
}
```

## 后端使用Protobuf发送/接收二进制数据
这里的后端使用NodeJS和Java实现Protobuf二进制数据的发送/接收，且同样看看区分短连接和长连接的实现

### 短连接——HTTP
在原生的NodeJS中可以自己编写代码开启一个简单的HTTP服务器，并自定义实现对HTTP请求的处理，当然你也可以使用一些现成的Web MVC框架例如Express来简化开发；而在Java中常见的还是使用Tomcat/JBoss这类已经久经沙场的Web容器比较方便，再配合上SpringMVC/Struts2等Web MVC框架的使用话，可以让Java Web开发人员把精力集中在业务逻辑处理方面；

#### NodeJS
不得不说基于JavaScript语言的后端开发平台NodeJS确实很强大，它把浏览器Ajax这种事件驱动的异步编程模型的写法从前端照搬到了后端，其核心库完美的实现了很多底层模块并提供友好的对外API，令你启动一个HTTP服务器也就只需要写几行代码的事情，除此之外引入的模块化机制完美的避开了JS中常见的“命名污染”，还有类似Java中的Maven一样的依赖包管理工具——NPM，简直让你觉得真的是“处处都运行着JavaScript”，Java处处运行的梦想好像要被JavaScript替代了似的

#### NodeJS使用[protobuf.js](https://github.com/dcodeIO/protobuf.js)处理Protobuf
由于NodeJS基于JavaScript语言，所以我们还是和前端的JavaScript代码一样使用[protobuf.js](https://github.com/dcodeIO/protobuf.js)来处理Protobuf，且使用了前面提到的TestProtobuf.proto

```java
var ProtoBuf = require("protobufjs");

var TestProtobuf = ProtoBuf.loadProtoFile(protobufDir+"TestProtobuf.proto").build("TestProtobuf"),
    TestProto = TestProtobuf.TestProto;
```

#### NodeJS启动HTTP服务并接收/发送二进制数据
在NodeJS中真的是就几句代码就启动HTTP服务器了

```java
var http = require("http");

var server = http.createServer(function(request, response){
	//处理request和返回response响应
});

server.listen(3000);
```

但这是只一个啥事都没干的HTTP服务器，真正的HTTP服务器至少能提供静态文件浏览服务，在NodeJS上这也需要我们自己去实现，写个serveStatic方法：其原理是根据请求路径去读取磁盘上的文件，如果存在的话读取成功后返回给前端，不存在就报404错误，为了避免每次都从磁盘读取我们还可以加入缓存

除了处理静态文件外，我们的重点还是放在NodeJS使用Protobuf发送/接收二进制数据：当我们识别一个来自客户端的请求参数是二进制数据时（这里是请求方法是POST且包含protobuf关键字），我们需要先收集完全部的二进制数据后方可解析，由于网络的传输可能不是一次到位全部传输过来，而是一段段（chunk）的过来，所以就有个收集的过程，这里使用了[bufferhelper](https://github.com/JacksonTian/bufferhelper)库简化收集网络二进制数据的过程，具体代码如下

```java
var server = http.createServer(function(request, response){
	var filePath = false;
	if(request.url == "/"){
        filePath = "index.html";
    }else if(request.method === "POST"){
		if(request.url.indexOf("protobuf") != -1){
			//BufferHelper参考链接 http://www.infoq.com/cn/articles/nodejs-about-buffer/
		    var bufferHelper = new BufferHelper();
		    request.on("data", function (chunk) {
		        bufferHelper.concat(chunk);
		    });
		    request.on("end", function () {
		        var buffer = bufferHelper.toBuffer();
		        var testProtoData = TestProto.decode(buffer);
		        response.writeHead(200, {"Content-Type": "application/x-protobuf"});
		        response.end(testProtoData.toBuffer());
		    });
		}
		
		return;
	}else{
        filePath = request.url;
    }

    var absPath = webRoot+filePath;
    serveStatic(response, cache, absPath);
});
```

可见在收集完二进制数据后的end回调方法中使用了TestProto来解码二进制，然后再原封不动的转换为Buffer后通过response的end方法作为响应返回给HTTP客户端

#### Java SpringMVC与Protobuf
Java SpringMVC从4.1.6开始使支持Protobuf协议的自动编解码，所以需要确保pom.xml文件中的Spring核心包以及SpringMVC包的版本都是4.1.6+，当然也需要确保依赖了Protobuf的Java包

```xml
<!-- springframework 4.0.7 RELEASE -->
<dependency>
	<groupId>org.springframework</groupId>
	<artifactId>spring-context</artifactId>
	<version>4.1.7.RELEASE</version>
</dependency>
<dependency>
	<groupId>org.springframework</groupId>
	<artifactId>spring-tx</artifactId>
	<version>4.1.7.RELEASE</version>
</dependency>
<dependency>
	<groupId>org.springframework</groupId>
	<artifactId>spring-jdbc</artifactId>
	<version>4.1.7.RELEASE</version>
</dependency>
 
<!-- spring mvc -->
<dependency>
	<groupId>org.springframework</groupId>
	<artifactId>spring-webmvc</artifactId>
	<version>4.1.7.RELEASE</version>
</dependency>
<dependency>
	<groupId>commons-fileupload</groupId>
	<artifactId>commons-fileupload</artifactId>
	<version>1.3.1</version>
</dependency>

<!-- protobuf -->
<dependency>
	<groupId>com.google.code</groupId>
	<artifactId>protobuf-java</artifactId>
	<version>2.4.0a</version>
</dependency>
<dependency>
    <groupId>com.googlecode.protobuf-java-format</groupId>
    <artifactId>protobuf-java-format</artifactId>
    <version>1.2</version>
</dependency>
```

然后web.xml配置了SpringMVC及其mvc.xml文件位置以及匹配后缀名

```xml
<!-- 引入上下文配置文件 -->
<context-param>
	<param-name>contextConfigLocation</param-name>
	<param-value>classpath:applicationContext.xml</param-value>
</context-param>
<listener>
	<listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
</listener>

<servlet>
	<servlet-name>spring-web</servlet-name>
	<servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
	<init-param>
		<param-name>contextConfigLocation</param-name>
		<param-value>classpath:spring/mvc.xml</param-value>
	</init-param>
	<load-on-startup>1</load-on-startup>
</servlet>

<servlet-mapping>
	<servlet-name>spring-web</servlet-name>
	<url-pattern>*.why</url-pattern>
</servlet-mapping>
```

关键的部分在mvc.xml配置中，这里使用mvc:annotation-driven的配置写法配置了消息转换器为ProtobufHttpMessageConverter令SpringMVC自动支持Protobuf的编解码

```xml
<!-- 配置只扫描web下面类文件，即controller和interceptors，只关注mvc的配置，整个应用的配置在applicationContext.xml -->
<context:component-scan base-package="com.why.game.web.*" />

<mvc:interceptors>
	<bean class="com.why.game.web.interceptor.ControllerInterceptor" />
</mvc:interceptors>
<mvc:annotation-driven>  
    <mvc:message-converters>  
        <bean class="org.springframework.http.converter.protobuf.ProtobufHttpMessageConverter"/>  
    </mvc:message-converters>  
</mvc:annotation-driven>
```

最后在SpringMVC的Controller中可使用RequestEntity直接操作传递过来的TestProto，并使用ResponseEntity把TestProto作为响应返回去给HTTP客户端

```java
@Controller
@RequestMapping("/")
public class TestController {

	@RequestMapping(value="/protobuf")
	@ResponseBody
	public ResponseEntity<TestProto> protobuf(RequestEntity<TestProto> requestProto){
		TestProto testProto = requestProto.getBody();
		String s = new String(testProto.toByteArray());
		System.out.println(s);
		System.out.println(testProto);
		HttpServiceCaller.printProtoStr(s);
		return ResponseEntity.ok(testProto);
	}

}
```

### 长连接——SocketIO/WebSocket
这里以SocketIO为例来看看其在NodeJS和Java中的使用，其实WebSocket的使用方法也是大同小异，仅仅是API略微差别，但思想步骤是一样适用的

#### NodeJS中的[SocketIO](https://github.com/socketio/socket.io)库
与前面介绍的SocketIO客户端[socket.io-client](https://github.com/socketio/socket.io-client)相对应的NodeJS服务端是[socket.io](https://github.com/socketio/socket.io)，我们需要在`package.json`添加dependencies依赖配置
> "socket.io" : "~1.4.5"

并使用npm install下载安装后，就可以直接在NodeJS中使用socket.io库来构建了SocketIO服务器了，下面实现一个简单的业务逻辑：把接收到的数据转换成大写后再发送回去给客户端

```java
var ProtoBuf = require("protobufjs");
var socketio = require("socket.io");

// Initialize from .proto file
var builder = ProtoBuf.loadProtoFile(path.join(__dirname, "www", "example.proto")),
    Message = builder.build("Message");

// SocketIO adapter
var io = socketio.listen(server);
io.set("log level", 1);
io.sockets.on("connection", function(socket){
    console.log(socket.id+" connecting...");
    socket.on("disconnect", function() {
        console.log("WebSocket disconnected");
    });
    socket.on("message", function(data) {
        try {
            // Decode the Message
            var msg = Message.decode(data);
            console.log("Received: "+msg.text);
            // Transform the text to upper case
            msg.text = msg.text.toUpperCase();
            // Re-encode it and send it back
            socket.send(msg.toBuffer());
			//socket.emit('message', msg.toBuffer());
            console.log("Sent: "+msg.text);
        } catch (err) {
            console.log("Processing failed:", err);
        }
    });
});
```

注意上面的代码先使用require引入了Protobuf和SocketIO模块，然后初始化Protobuf的消息体并让SocketIO启动监听，这里SocketIO监听的server其实就是NodeJS创建的HTTP服务器，因为在NodeJS里面HTTP服务器和SocketIO服务器共用同一个端口；接下来就是Protobuf对接收到的二进制数据进行解码打印，然后把字母转换为大写后再编码发送出去

#### NodeJS中的[WebSocket](https://github.com/websockets/ws)库
在NodeJS中使用WebSocket最简便的方式是使用GitHub上名为[ws](https://github.com/websockets/ws)的项目，其号称可能是NodeJS里面速度最快的WebSocket库，我们可以在`package.json`添加dependencies依赖配置
> "ws": "~0.4"

并使用npm install下载安装后，就可以在NodeJS里使用ws库来构建WebSocket服务器了，实现与上面SokcetIO服务器相同逻辑的代码如下，可见WebSocket与SocketIO的API是大同小异的

```java
// WebSocket adapter
var wss = new ws.Server({server: server});
wss.on("connection", function(socket) {
    console.log("New WebSocket connection");
    socket.on("close", function() {
        console.log("WebSocket disconnected");
    });
    socket.on("message", function(data, flags) {
        if (flags.binary) {
            try {
                // Decode the Message
                var msg = Message.decode(data);
                console.log("Received: "+msg.text);
                // Transform the text to upper case
                msg.text = msg.text.toUpperCase();
                // Re-encode it and send it back
                socket.send(msg.toBuffer());
                console.log("Sent: "+msg.text);
            } catch (err) {
                console.log("Processing failed:", err);
            }
        } else {
            console.log("Not binary data");
        }
    });
});
```

#### Java中的[Netty-SocketIO](https://github.com/mrniko/netty-socketio)库
在Java中我们使用了GitHub上一个名为[netty-socketio](https://github.com/mrniko/netty-socketio)的项目，由名字可看出其是在Netty框架基础上实现的SocketIO协议，并提供了事件驱动注册监听器的写法，当你从NodeJS转换代码过来时会发现其写法大同小异：即NodeJS使用on方法来注册监听事件，netty-socketio中使用addEventListener方法来实现；NodeJS使用emit触发事件，而netty-socketio中使用sendEvent来触发事件等

首先在pom.xml中加入netty-socketio的依赖以及Protobuf的依赖：

```xml
<dependency>
	<groupId>com.corundumstudio.socketio</groupId>
	<artifactId>netty-socketio</artifactId>
	<version>1.7.11-SNAPSHOT</version>
</dependency>
<dependency>
	<groupId>org.slf4j</groupId>
	<artifactId>slf4j-simple</artifactId>
	<version>1.7.7</version>
</dependency>

<!-- protobuf -->
<dependency>
	<groupId>com.google.code</groupId>
	<artifactId>protobuf-java</artifactId>
	<version>2.4.0a</version>
</dependency>
<dependency>
    <groupId>com.googlecode.protobuf-java-format</groupId>
    <artifactId>protobuf-java-format</artifactId>
    <version>1.2</version>
</dependency>
```

接下来就是写一个实现了ConnectListener和DisconnectListener这2个分别代表连接监听与断开监听的接口的SocketIO服务器类，然后该类内部再使用addEventListener来监听感兴趣的事件，对应上面NodeJS SocketIO服务器逻辑的Java SocketIO服务器类如下

```java
public class SocketIOProtoServer implements ConnectListener, DisconnectListener{
	
	private static final String HOST = "localhost";
	private static final int PORT = 3001;
	
	private final SocketIOServer server;
	
	public SocketIOProtoServer(){
        server = new SocketIOServer(config());
	}
	
	private Configuration config(){
	    Configuration config = new Configuration();
        config.setHostname(HOST);
        config.setPort(PORT);
        config.setMaxFramePayloadLength(1024 * 1024);
        config.setMaxHttpContentLength(1024 * 1024);
        return config;
	}
	
	public void start(){
        server.addConnectListener(this);
        server.addDisconnectListener(this);
        
        server.addEventListener("message", byte[].class, new DataListener<byte[]>() {
            @Override
            public void onData(SocketIOClient client, byte[] data, AckRequest ackRequest) {
            	Message message = Message.parse(data);
            	System.out.println("Received: "+message.getText());
                // Transform the text to upper case
            	message.setText(message.getText().toUpperCase());
                // Re-encode it and send it back
            	client.sendEvent("message", message.toByteArray());
                System.out.println("Sent: "+message.getText());
            }
        });
        
        server.start();
        System.out.println("\n------ "+this.getClass().getSimpleName()+"start on "+PORT+" ------\n");
	}
	
	public void stop(){
	    server.stop();
	}

	@Override
	public void onConnect(SocketIOClient client) {
		System.out.println(client.getSessionId()+" connecting...");
	}
	
	@Override
	public void onDisconnect(SocketIOClient client) {
		System.out.println(client.getSessionId()+" disconnecting...");
	}
	
	public static void main(String[] args){
    	new SocketIOProtoServer().start();
    }

}
```

可见其接收/发送Protobuf二进制的代码与NodeJS相比其实是相当类似的，然后封装的Message.java如下

```java
public class Message {

	private String text;
	
	public Message() {
		
	}

	public Message(Example.Message proto){
		text = proto.getText();
	}
	
	public byte[] toByteArray(){
		Example.Message.Builder builder = Example.Message.newBuilder();
		builder.setText(text);
		return builder.build().toByteArray();
	}
	
	public static Message parse(byte[] bytes){
		Example.Message proto = null;
		try {
			proto = Example.Message.parseFrom(bytes);
		} catch (InvalidProtocolBufferException ex) {
			throw new IllegalArgumentException(ex);
		}
		return new Message(proto);
	}

	public String getText() {
		return text;
	}

	public void setText(String text) {
		this.text = text;
	}
	
}
```

#### Java中的WebSocket库
此处我们基于[Netty4](https://github.com/netty/netty)下的WebSocket实现包来看看上面SocketIO服务类在Netty中长什么样，其中大部分代码均源自Netty自带的example包里的；首先看看Netty中的WebSocketServer

```java
public final class WebSocketServer {

    static final boolean SSL = System.getProperty("ssl") != null;
    static final int PORT = Integer.parseInt(System.getProperty("port", SSL? "8443" : "3000"));

    public static void main(String[] args) throws Exception {
        // Configure SSL.
        final SslContext sslCtx;
        if (SSL) {
            SelfSignedCertificate ssc = new SelfSignedCertificate();
            sslCtx = SslContextBuilder.forServer(ssc.certificate(), ssc.privateKey()).build();
        } else {
            sslCtx = null;
        }

        EventLoopGroup bossGroup = new NioEventLoopGroup(1);
        EventLoopGroup workerGroup = new NioEventLoopGroup();
        try {
            ServerBootstrap b = new ServerBootstrap();
            b.group(bossGroup, workerGroup)
             .channel(NioServerSocketChannel.class)
             .handler(new LoggingHandler(LogLevel.INFO))
             .childHandler(new WebSocketServerInitializer(sslCtx));

            Channel ch = b.bind(PORT).sync().channel();

            System.out.println("Open your web browser and navigate to " +
                    (SSL? "https" : "http") + "://127.0.0.1:" + PORT + '/');

            ch.closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}
```

如下是WebSocketServerInitializer，里面设置了各种HTTP解码器，然后还有由HTTP协议升级到WebSocket协议的处理器类WebSocketServerProtocolHandler，最后是WebSocket帧处理器类WebSocketFrameHandler

```java
public class WebSocketServerInitializer extends ChannelInitializer<SocketChannel> {

    private static final String WEBSOCKET_PATH = "/ws";

    private final SslContext sslCtx;

    public WebSocketServerInitializer(SslContext sslCtx) {
        this.sslCtx = sslCtx;
    }

    @Override
    public void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        if (sslCtx != null) {
            pipeline.addLast(sslCtx.newHandler(ch.alloc()));
        }
        pipeline.addLast(new HttpServerCodec());
        pipeline.addLast(new HttpObjectAggregator(65536));
        pipeline.addLast(new WebSocketServerProtocolHandler(WEBSOCKET_PATH, null, true));
        pipeline.addLast(new WebSocketFrameHandler());
    }
}
```

最后看看实现与之前的服务器业务逻辑（把接收到的数据转换成大写后再发送回去给客户端相同的WebSocketFrameHandler类的写法：

```java
public class WebSocketFrameHandler extends SimpleChannelInboundHandler<WebSocketFrame> {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketFrameHandler.class);

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, WebSocketFrame frame) throws Exception {
        // ping and pong frames already handled

        if (frame instanceof TextWebSocketFrame) {
            // Send the uppercase string back.
            String request = ((TextWebSocketFrame) frame).text();
            logger.info("{} received {}", ctx.channel(), request);
            ctx.channel().writeAndFlush(new TextWebSocketFrame(request.toUpperCase(Locale.US)));
        } else if(frame instanceof BinaryWebSocketFrame){
        	ByteBuf byteBuf = ((BinaryWebSocketFrame) frame).content();
        	byte[] data = new byte[byteBuf.capacity()];
        	byteBuf.readBytes(data);
        	Message message = Message.parse(data);
        	System.out.println("Received: "+message.getText());
            // Transform the text to upper case
        	message.setText(message.getText().toUpperCase());
            // Re-encode it and send it back
        	byte[] bytes = message.toByteArray();
        	ByteBuf payload = ctx.alloc().buffer(bytes.length);
        	payload.writeBytes(bytes);
        	ctx.channel().writeAndFlush(new BinaryWebSocketFrame(payload));
            System.out.println("Sent: "+message.getText());
        } else {
            String message = "unsupported frame type: " + frame.getClass().getName();
            throw new UnsupportedOperationException(message);
        }
    }
}
```

可见在使用Message类编解码的使用方式是一样的，只是Netty中接收/发送二进制数据需要基于ByteBuf类去转换为byte[]给Message编解码；而在SocketIO中是以泛型编程的方式直接声明接收二进制数据byte[]；

这也导致了在Netty里面可以写一个统一处理WebSocket的Handler，在处理WebSocket帧时可以判定是字符帧（TextWebSocketFrame还是字节帧（BinaryWebSocketFrame，然后分别做处理；但是在SocketIO里面在添加监听器addEventListener时就决定了处理类型到底是byte[]还是String，不能是一个泛泛的Object对象然后区分处理，除非自己自定义一个泛泛的SocketIOFrame类然后根据什么内部bit位去判断到底是转换为byte[]还是String后才分别处理，这就需要看看netty-socketio的源码实现去了解了。

## 源码
* [开篇介绍Protobuf的Java例子代码](https://github.com/whg333/protobuf-sample)
* [介绍短连接结合Protobuf的例子的代码](https://github.com/whg333/cocos2d-js-ajax-protobuf-nodejs-springmvc)
* 介绍长连接结合Protobuf例子的[前端代码](https://github.com/whg333/protobuf.js/tree/master/examples)和[后端代码](https://github.com/whg333/Cocos2d-JS-ProtobufChat/tree/master/backend/java/src/main/java)

## 参考
* [XMLHttpRequest Level 2 使用指南](http://www.ruanyifeng.com/blog/2012/09/xmlhttprequest_level_2.html)——里面提及了新旧2代XMLHttpRequest对象对二进制传输的支持
* [WebSocket 是什么原理？为什么可以实现持久连接？](http://www.zhihu.com/question/20215561)——知乎上一篇比较通俗且接地气的像你解释什么是WebSocket

（完）
