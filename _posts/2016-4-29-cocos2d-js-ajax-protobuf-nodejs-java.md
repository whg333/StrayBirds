---
layout: post
title: Cocos2d-JS/Ajax用Protobuf与NodeJS/Java通信
description: "Cocos2d-JS/Ajax用Protobuf与NodeJS/Java通信"
category: [JavaScript]
tags: [Cocos2d-JS, Ajax, Protobuf, NodeJS, Java]
comments: true
---

## Google的Protobuf
Protobuf全称为“Protocol Buffers”，是Google开源出来的一个序列化协议并配备多种编程语言的实现（Java、C、C++、Python等，甚至JavaScript、ActionScript都有对应的实现），其本质是按照协议规范编写proto文件，该proto文件内容由若干个message消息体组成，而message消息体是由编程语言中常用的数据类型（int、long、String等）对应的Protobuf字段类型组合而成的，Protobuf的作用是可以帮你把定义好的message消息体按协议编码（Encode）转为二进制字节流（byte[]），反之亦可帮你把已编码的byte[]字节流再解码(Decode)还原回来。

### 操作步骤
举个Java的例子，你想使用Protobuf把Java中的对象转成byte[]的话，需要如下这几个步骤：

1. 根据Protobuf规范编写proto文件：该proto文件内需要定义一个与Java对象匹配的message消息体，该message消息体中的字段类型与Java对象的成员变量字段类型一一对应上
2. 利用Protobuf对应Java语言的protoc.exe生成工具去根据第1步定义的proto文件生成对应的Protobu编解码Java类
3. 使用第2步生成的Protobuf编解码Java类对Java对象做编解码的工作，例如编码Java对象为byte[]或者解码byte[]为Java对象

有了Protobuf这个序列化byte[]编解码的利器，相较于文本协议的Xml和Json来说的话，相当于做了很大的压缩！所以无论是在需要序列化存储的场景，还是在网络序列化传输场景，Protobuf都不失为一个好抉择！

### 序列化传输
例如在网络传输的场景下，我们可以用Protobuf在发送端把Java对象编码为byte[]后发送出去，然后在接收端再用Protobuf解码(Decode)byte[]来还原成对应的Java对象供程序使用，这样就可以在网络传输方面极大的缩减网络流量了。

### 序列化存储
而在存储的场景下，无论是基于内存/磁盘/RMDB的存储，都能节约成本：

1. 内存——可以在使用Protobuf编码为byte[]后存储进memcached/redis中
2. 磁盘——同样可以用Protobuf编码为byte[]后存储成文件，需要存储多个byte[]则需要加入分隔符用于区分单个，类似网络传输中的成帧/解析
3. RMDB——形如MySql的RMDB，也都有支持byte[]二进制存储的Blob字段

### 总结与思考
总结一下，因为Protobuf已经message转换为二进制字节流byte[]了，而计算机对二进制字节流的操作最在行了，所以除了压缩节约成本外，其可用性也接近计算机底层处理的本质了：因为无论是什么东西在计算机内的表示都是字节（即8个二进制位）！字符串String可以转为byte[]、图片可以转为byte[]、任何东西想在计算机内表示都必须是byte[]！

## 前后端使用Protobuf通信
前面提到过Protobuf网络传输的场景，这里我们就来看看：前端（Cocos2d-JS/Ajax）如何使用Protobuf与后端（NodeJS/Java）通信？由于Protobuf能把proto文件定义的消息体转换为二进制字节流（byte[]），所以问题就变成：前端（Cocos2d-JS/Ajax）如何使用二进制与后端（NodeJS/Java）通信？

网络通信一般分为2类：短连接和长连接。短连接一般说的是基于Http协议的请求/响应的连接；而长连接则是基于TCP/IP协议的3次握手不随意中断的连接；当然其实Http协议是基于TCP/IP协议的，只是请求/响应这种模式令其相较TCP/IP来说更“随意”中断了一点，但中断的后果是太浪费底层TCP/IP连接了，所以之后的Http1.1以及2.0为了减少浪费提出了Keep-Alive及多路复用等改进，甚至演化出了Html5的WebSocket协议这种基于Http协议的全双通长连接，发展趋势轨迹：TCP/IP长连接-->HTTP短连接-->WebSocket长连接

下面根据这2个分类连接说说基于JavaScript的前端（Cocos2d-JS/Ajax）如何用Protobuf与后端（NodeJS/Java）通信

### 短连接——HTTP
无论是Cocos2d-JS还是Ajax，其进行Http通信都是基于JavaScript的XMLHttpRequest对象！所以只要搞清楚XMLHttpRequest对象如何与后端通信发送/接受二进制即可。使用如下几步来操作XMLHttpRequest发送Protobuf二进制数据：

#### 1. 获取XMLHttpRequest
Cocos2d-JS里就有XMLHttpRequest对象的支持，直接使用`cc.loader.getXMLHttpRequest()`即可获取到；而Ajax里面的XMLHttpRequest对象由于浏览器支持不同，可以使用如下代码获取：

```java
function createXMLHttpRequest(){
    if(window.ActiveXObject){ //IE only
        return new ActiveXObject("Microsoft.XMLHTTP");
    }else if(window.XMLHttpRequest){ //others
        return new XMLHttpRequest();
    }
}
```

#### 2. 设置XMLHttpRequest头部支持Protobuf协议发送/接受
无论是Cocos2d-JS还是Ajax，其XMLHttpRequest对象本质都一样，所以如下open(打开)url以及setRequestHeader(设置请求头部)等代码都是通用的

```java
var xhr = cc.loader.getXMLHttpRequest(); // or use createXMLHttpRequest() in Ajax 
xhr.open('POST', 'http://localhost:3000/protobuf.why');

xhr.setRequestHeader('Content-Type','application/x-protobuf');
xhr.setRequestHeader('Accept','application/x-protobuf');

if (xhr.overrideMimeType){
    //这个是必须的，否则返回的是字符串，导致protobuf解码错误
    //具体见http://www.ruanyifeng.com/blog/2012/09/xmlhttprequest_level_2.html
    xhr.overrideMimeType('text/plain; charset=x-user-defined');
}
```

#### 3. 前端使用[protobuf.js](https://github.com/dcodeIO/protobuf.js)来编解码Protobuf
[protobuf.js](https://github.com/dcodeIO/protobuf.js)是GitHub上使用JavaScript实现Protobuf Buffer协议编解码的项目，这里我们使用它来作为前端JavaScript编解码Protobuf的利器

##### 3.1 引入protobuf.js
这里引入的[protobuf.js](https://github.com/dcodeIO/protobuf.js)版本为5.0.1，其中主要使用到了long.js、bytebuffer.js和protobuf.js这3个JS文件，如果使用NodeJS的话，直接在`package.json`添加dependencies依赖配置
> "protobufjs": "~5.0.1"

然后使用
> npm install

即可完成对该依赖JS文件的下载，找到那3个文件拷贝到前端JS，然后在前端的index.html中引入protobuf.js:

```java
<script src="../protobuf/long.js"></script>
<script src="../protobuf/bytebuffer.js"></script>
<script src="../protobuf/protobuf.js"></script>
<script>
    if (typeof dcodeIO === 'undefined' || !dcodeIO.ProtoBuf) {
        throw(new Error("ProtoBuf.js is not present. Please see www/index.html for manual setup instructions."));
    }
</script>
```

#### 3.2 使用protobuf.js
引入protobuf.js后就可以在JS代码中使用protobuf.js了，我们这里用于测试的TestProtobuf.proto文件如下：

```java
package TestProtobuf;

option java_package = "com.why.game.protobuf";
option java_outer_classname = "TestProtobuf";

message TestProto{
	optional int32 id = 1;
	optional string name = 2;
}
```

然后在JS中加载该TestProtobuf.proto文件，并把该proto文件中定义的TestProto消息体赋值为JS局部变量TestProto：

```java
var ProtoBuf = dcodeIO.ProtoBuf,
    TestProtobuf = ProtoBuf.loadProtoFile('../protobuf/TestProtobuf.proto').build('TestProtobuf'),
    TestProto = TestProtobuf.TestProto;
```

如此一来我们就可以用TestProtobuf.proto文件中定义的消息体来发送/接受二进制了：发送的时候使用XMLHttpRequest对象的send方法发送经由TestProto编码(encode)后的buffer数组（本质也是二进制字节流），接受的时候同样使用TestProto解码(decode)接受到的二进制数据：

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
    name:'testProtoName测试987'
});
xhr.send(testProto.toBuffer());
```

### 长连接——WebSocket/SocketIO

（未完待续。。。）
