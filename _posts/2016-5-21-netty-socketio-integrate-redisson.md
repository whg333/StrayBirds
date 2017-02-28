---
layout: post
title: Netty-SocketIO整合Redisson
description: "Netty-SocketIO整合Redisson"
category: [Java]
tags: [Netty, SocketIO, Redisson, Java]
comments: true
---

## [Netty-SocketIO](https://github.com/mrniko/netty-socketio)
[Netty-SocketIO](https://github.com/mrniko/netty-socketio)是GitHub上一个基于Netty开发实现SocketIO协议的服务器端框架，在前一篇博客[《Cocos2d-JS/Ajax用Protobuf与NodeJS/Java通信》](http://www.iclojure.com/blog/articles/2016/04/29/cocos2d-js-ajax-protobuf-nodejs-java)的长连接中就提到了SocketIO协议以及Netty-SocketIO库，对SocketIO/WebSocket协议以及Netty-SocketIO不熟悉的可以先去看看，本篇博客的重点在Netty-SocketIO中如何整合使用Redisson

## [Redisson](https://github.com/mrniko/redisson)与[Redis](http://redis.io/)
那么[Redisson](https://github.com/mrniko/redisson)又是什么东西呢？[Redisson](https://github.com/mrniko/redisson)同样是在GitHub上发布的开源项目，其GitHub项目主页介绍其实Redisson本质上是个Redis Java客户端，与其他Redis Java客户端（例如[Jedis](https://github.com/xetorthio/jedis)）除了封装Redis的常用命令操作外，Redisson还提供了高级的类Java的数据结构（例如List, Set, Map, Queue, SortedSet, ConcureentMap, Lock, AtomicLong, CountDownLatch等等），在代码级别的使用上会让你忘记底层Redis的存在，以为与之通信的是一个纯面向对象的数据库。

好吧，说了那么多。。。[「Talk is cheap. Show me the code」（屁话少说，放码过来）](http://www.zhihu.com/question/23090743/answer/23581884)（通过该链接才知道写tokenizer和grammar analyzer是C语言界约战的降龙十八掌，2333）

```java
//单机模式
private static final String SINGLE_SERVER = "localhost:6381";

Config redissonConfig = new Config();
redissonConfig.useSingleServer().setAddress(SINGLE_SERVER);
RedissonClient redisson = Redisson.create(redissonConfig);

List<Integer> list = redisson.getList("list");
list.add(1);
list.add(2);
list.add(3);
list.add(4);

Message message = new Message("text_"+new Random().nextInt());
List<Message> msgList = redisson.getList("msgList");
msgList.add(message);
```

执行如上代码后，如何验证查看实际Redis中存储的数据呢？除了Redis的客户端命令行工具redis-cli.exe外，这里使用了GitHub上国人用Java写的一款Redis GUI客户端——[RedisClient](https://github.com/caoxinyu/RedisClient)来查看其实际存储在Redis的数据，主要是GUI相对命令行工具Redis-cli.exe的查询结果显示更为方便且直观一些

![pic00](http://cejdh.img48.wal8.com/img48/533449_20151202165458/146404262943.png)

![pic01](http://cejdh.img48.wal8.com/img48/533449_20151202165458/146404262956.png)

## Netty-SocketIO整合Redisson与client数据存储
另外为什么要在Netty-SocketIO整合Redisson呢？因为发现使用Netty-SocketIO长连接建立完毕后，会有存储client信息的需求，而Netty-SocketIO默认的存储机制是基于内存的，其本质就是在一个JVM内基于ConcurrentHashMap的键值存储，但单机的JVM毕竟内存有限且对长连接数目也有限制，那么摆脱单机限制扩展到集群的分布式存储结构呢？

分布式存储方面容易想到NoSql，而NoSql中的键值存储则以Memcached和Redis使用率比较广，memcached的Value方面比较原始（byte[]），且原生不支持落地存储，一般单纯的作为缓存用于提升性能；而Redis的Value支持多种结构（Strings, Lists, Sets, Sorted Sets, Hashes等），且支持落地存储，除此外支持多实例分布式存储，除了可配置主从结构外，Redis 3版本新增的集群Cluster模式更把Redis的高可用性提升了一个等级

鉴于Redis的以上优点，所以选择了Redis存储Netty-SocketIO的client信息，而选择Redisson而不是其他Redis客户端整合进Netty-SocketIO里面，一个主要原因是因为这2个GitHub开源项目的作者是同一个人，所以自然而然提供了近乎无缝的整合体验，请看如下代码

```java
//单机模式
private static final String SINGLE_SERVER = "localhost:6381";

//集群模式只需要写一个redis cluster模式下的服务器地址，
//因为redisson也和jedis一样会自动识别其他cluster模式下master和slave
private static final String CLUSTER_SERVER = "localhost:7000";

public SocketIORedissonServer(){
    server = new SocketIOServer(config());
}

private Configuration config(){
    Configuration socketIOConfig = new Configuration();
    socketIOConfig.setHostname(HOST);
    socketIOConfig.setPort(PORT);
    socketIOConfig.setMaxFramePayloadLength(1024 * 1024);
    socketIOConfig.setMaxHttpContentLength(1024 * 1024);
    
    Config redissonConfig = new Config();
    //redissonConfig.useSingleServer().setAddress(SINGLE_SERVER);
	redissonConfig.useClusterServers().addNodeAddress(CLUSTER_SERVER);
    
    RedissonClient redisson = Redisson.create(redissonConfig);
    socketIOConfig.setStoreFactory(new RedissonStoreFactory(redisson));
    return socketIOConfig;
}
```

可见只需要设置Redisson的Config，然后创建Redisson客户端，并设置为Netty-SocketIO的存储工厂，然后就可以在需要存储Netty-SocketIO客户端的地方调用client.set，以及在需要获取已经存储的客户端数据调用client.get，请看如下例子代码

```java
@Override
public void onConnect(SocketIOClient client) {
    String sessionId = client.getSessionId().toString();
    client.set("sessionId", sessionId);
    System.out.println(sessionId+" connecting..."+client.get("sessionId"));
}

@Override
public void onDisconnect(SocketIOClient client) {
    String sessionId = client.getSessionId().toString();
	System.out.println(sessionId+" disconnecting..."+client.get("sessionId"));
	client.del("sessionId");
}
```

当客户端连接上后使用client.set存储了该客户端的sessionId，然后使用client.get取出已经存储的sessionId打印出来验证一下；当客户端断开连接后使用client.del删除了该sessionId；

那么调用client.set后实际的数据在Redis中是如何存储的呢？依旧使用RedisClient来查看一些

![pic02](http://cejdh.img48.wal8.com/img48/533449_20151202165458/146404262964.png)

发现其实Netty-SocketIO整合Redisson后，当调用client.set后Redisson自动把client的sessionId（例如这里是20d370c9-0d19-4450-935b-47cad2f50dff）作为Key，存储的Value结构是Hash表，然后再把在client.set中指定的key作为该Hash表的子域key（例如这里是字符串"sessionId"），value作为该Hash表子域key存储的值

除此之外，当在onDisconnect方法中调用client.del("sessionId")后，Redisson驱动底层的Redis去删除Key为sessionId且域key为"sessionId"的记录，删除完毕后发现Key为sessionId的Hash表数据为空的话，就会自动把Key为sessionId的记录也删除了

## Netty-SocketIO使用Redisson的Topic实现分布式发布/订阅
Redisson为了方便Redis中的Publish/Subscribe（发布/订阅）机制的使用，将其封装成Topic（主题），并提供了代码级别的Publish/Subscribe操作，如此一来多个JVM进程连接到Redis（单机/集群）后，便可以实现在一个JVM进程中发布（Publish）的主题（Topic），在其他已经订阅（Subscribe）了该主题的JVM进程中就能及时收到消息

```java
RTopic<ConnectMessage> topic = redisson.getTopic("connected");
topic.addListener(new MessageListener<ConnectMessage>() {
    @Override
    public void onMessage(String channel, ConnectMessage message) {
        System.out.println("onMessage: "+message.getNodeId()+", "+message.getSessionId());
    }
});

// in other thread or JVM
RTopic<ConnectMessage> topic = redisson.getTopic("connected");
topic.publish(new ConnectMessage(client.getSessionId()));
```

其实Netty-SocketIO整合了Redisson后，内部也使用了Redisson的Topic机实现发布/订阅机制，如下为Netty-SocketIO源码中的PubSubStore接口

```java
package com.corundumstudio.socketio.store.pubsub;

public interface PubSubStore {

    void publish(String name, PubSubMessage msg);

    <T extends PubSubMessage> void subscribe(String name, PubSubListener<T> listener, Class<T> clazz);

    void unsubscribe(String name);

    void shutdown();

}
```

而在其整合Redisson后使用了如下实现类RedissonPubSubStore，可见其中使用的还是redisson.getTopic的方式

```java
@Override
public void publish(String name, PubSubMessage msg) {
    msg.setNodeId(nodeId);
    redissonPub.getTopic(name).publish(msg);
}

@Override
public <T extends PubSubMessage> void subscribe(String name, final PubSubListener<T> listener, Class<T> clazz) {
    RTopic<T> topic = redissonSub.getTopic(name);
    int regId = topic.addListener(new MessageListener<T>() {
        @Override
        public void onMessage(String channel, T msg) {
            if (!nodeId.equals(msg.getNodeId())) {
                listener.onMessage(msg);
            }
        }
    });

    Queue<Integer> list = map.get(name);
    if (list == null) {
        list = new ConcurrentLinkedQueue<Integer>();
        Queue<Integer> oldList = map.putIfAbsent(name, list);
        if (oldList != null) {
            list = oldList;
        }
    }
    list.add(regId);
}
```

所以当Netty-SocketIO整合Redisson后，我们可以简单的使用如下代码实现消息分布式发布/订阅，和前面使用Redisson的方式类似

```java
server.getConfiguration().getStoreFactory().pubSubStore().subscribe("connected", new PubSubListener<ConnectMessage>() {
    @Override
    public void onMessage(ConnectMessage message) {
        System.out.println("onMessage: " + message.getNodeId() + ", " + message.getSessionId());
    }
}, ConnectMessage.class);
```

```java
server.getConfiguration().getStoreFactory().pubSubStore().publish("connected", new ConnectMessage(client.getSessionId()));
```

但这种火车链式调用是我们所不愿看到的，我们可以将PubSubStore的引用保存到实例变量中缩短下代码

```java
private final PubSubStore pubSubStore;

public SocketIORedissonServer(){
    server = new SocketIOServer(config());
    pubSubStore = server.getConfiguration().getStoreFactory().pubSubStore();
}

@Override
public void onConnect(SocketIOClient client) {
    String sessionId = client.getSessionId().toString();
    client.set("sessionId", sessionId);
    System.out.println(sessionId+" connecting..."+client.get("sessionId"));

    pubSubStore.publish("connected", new ConnectMessage(client.getSessionId()));
}
```

如此一来就可以在SocketIO Server的语义下执行发布/订阅，倒也合情合理吧

## 遇到的问题及其解决
看起来上面所介绍的Netty-SokcetIO整合Redisson及其简单使用好像是一步到位似得，但其实整个整合过程中还是遭遇了不少问题的，而且很多问题都是redis中的。下面就总结性遇到的问题及其解决，也给自己提个醒：实践出真知

### ERR unknown command 'EVAL'
出现这个问题是因为使用的redis版本过低，Redisson内部使用执行lua脚本的方式去完成对Redis的操作，而Redis执行lua脚本的EVAL命令是从Redis 2.6.0 版本开始支持的，所以出现此错误代表需要升级Redis版本到2.6以上版本即可

### ERR Error compiling script (new function): user_script:1: '=' expected near 'end'
为了解决Redis不支持EVAL错误，升级Redis到3.0，于是尝试在cmd命令行下使用redis-cli.exe eval执行一个简单的lua脚本，但却报了此错误，后来发现应该使用**--eval**而不是eval去执行lua脚本文件

### ERR unknown command 'CLUSTER'
使用Redisson的useClusterServers单机模式没问题后，想尝试下Redis 3版本中新增的Cluster集群模式，于是用redissonConfig.useSingleServer().setAddress(SINGLE_SERVER);来配置Redisson，但却报错了；原因比较简单，就是因为没有配置Redis运行Cluster模式，这里有篇[《windows下使用RedisCluster集群简单实例》](http://www.jianshu.com/p/22af55518f6d)详解了如何在Win7下配置Redis运行Cluster模式的，照着一步步去做即可

### [ERR] Node 127.0.0.1:7000 is not empty. Either the node already knows other nodes (check with CLUSTER NODES) or contains some key in database 0.
这个错误是执行如下命令出现的

> redis-trib.rb create --replicas 1 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:70
04 127.0.0.1:7005

出错原因是因为Redis已经检测到有Cluster集群存在了，即redis-ctrib.rb create --replicas命令应该只在**第一次创建Cluster集群时**使用，在创建Cluster集群完毕后，即使关掉集群内所有节点（master/slave），也只需要重启各个节点即可，而不必再次执行redis-ctrib.rb create --replicas命令了

### (error) MOVED 12291 127.0.0.1:7002
这个错误原因是当你配置Redis运行Cluster模式后，使用了单机模式登陆集群中的某台节点，但要查询的数据却不在本节点上；即用

> redis-cli.exe -h localhost -p 7000

登陆到端口7000上，但是集群数据却保存在了7002上，由于使用单机登陆模式，所以Redis不能自动帮你跳转到7002上，于是报错提醒需要转移到7002端口上查询数据；

解决办法是使用如下命令登陆

> redis-cli.exe **-c** -h localhost -p 7000

注意多了个-c代表集群登陆！如此一来即使登陆的是集群7000端口，查询的数据在集群7002端口的话，Redis就能自动帮你跳转到集群7002中做查询了

## 源码
* [SocketIORedissonServer及其他Netty-Socket例子也可参考下](https://github.com/whg333/Cocos2d-JS-ProtobufChat/tree/master/backend/java/src/main/java)

## 参考
* [windows下使用RedisCluster集群简单实例](http://www.jianshu.com/p/22af55518f6d)
* [Redis 命令参考 » 集群教程](http://doc.redisfans.com/topic/cluster-tutorial.html)

（完）