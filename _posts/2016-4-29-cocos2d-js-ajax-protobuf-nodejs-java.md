---
layout: post
title: Cocos2d-JS/Ajax用Protobuf与NodeJS/Java通信
description: "Cocos2d-JS/Ajax用Protobuf与NodeJS/Java通信"
category: [JavaScript]
tags: [Cocos2d-JS, Ajax, Protobuf, NodeJS, Java]
comments: true
---

## Google的Protobuf
Protobuf全称为“Protocol Buffers”，是Google开源出来的一个序列化协议并配备多种编程语言的实现（Java、C、C++、Python等，甚至JavaScript、ActionScript都有对应的实现），其本质是把编程语言中常用的数据类型（int、long、String等）按业务需要按照协议编写规范定义为一个消息message，Protobuf可以帮你把定义好的message按照协议进行编码（Encode）转为二进制字节流（byte[]），反之亦可帮你把已经编码为byte[]的字节流再解码(Decode)还原回来。

举个Java的例子，你想使用Protobuf把Java中的对象转成byte[]的话，需要如下这几个步骤：

1. 根据Protobuf规范编写proto文件：该proto文件内需要定义一个与Java对象匹配的message消息体，该message消息体中的字段类型与Java对象的成员变量字段类型一一对应上
2. 利用Protobuf对应Java语言的protoc.exe生成工具去根据第1步定义的proto文件生成对应的Protobu编解码Java类
3. 使用第2步生成的Protobuf编解码Java类对Java对象做编解码的工作，例如编码Java对象为byte[]或者解码byte[]为Java对象

有了Protobuf这个利器，无论是在需要序列化存储的场景，还是在网络序列化传输场景，相较于Xml和Json来说的话，相当于做了很大的压缩！

在网络传输的应用场景下，我们可以用Protobuf在发送端把Java对象编码为byte[]后发送出去，然后在接收端再用Protobuf解码(Decode)byte[]来还原成对应的Java对象供程序使用，这样就可以在网络传输方面极大的缩减网络流量了。

## XMLHttpRequest发送二进制

（未完待续。。。）
