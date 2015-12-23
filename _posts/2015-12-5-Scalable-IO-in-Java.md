---
layout: post
title: Scalable IO in Java——多Reactor的代码实现
description: "Scalable IO in Java——多Reactor的代码实现"
category: [Java]
tags: [reactor, nio]
comments: true
---

## Java高伸缩性IO处理
在[Doug Lea](http://gee.cs.oswego.edu/)大神的经典NIO框架文章[《Scalable IO in Java》](http://gee.cs.oswego.edu/dl/cpjslides/nio.pdf)中，具体阐述了如何把Reactor模式和Java NIO整合起来，一步步理论结合Java代码实践去构建了一套高伸缩性的网络处理框架雏形，从当今的流行NIO框架（[Netty](http://netty.io/)、[Main](http://mina.apache.org/)、[Grizzly](https://grizzly.java.net/)）中无不看到其本质均与该文章所述架构不谋而合（或者也可以说其实是借鉴并以现代化的方式实现了Doug Lea的思想吧），这里总结《Scalable IO in Java》中的要点并记录下自己实现多Reactor的过程中遇到的坑

### 网络服务的基本结构
当今网络上的各种基于TCP/IP的应用服务，其对1次请求的处理过程的本质流程结构均为

1. 从底层IO读取字节请求
2. 把读取后的字节请求进行解码成为自己的业务请求对象
3. 把解码后的业务请求对象进行业务处理
4. 把处理后的响应编码为底层IO可写入的字节响应
5. 利用底层IO返回（发出）编码后的字节响应

![network_structure](http://cejdh.img47.wal8.com/img47/533449_20151202165458/14508614065.png)

整体的流程如上述5步所示，但具体每步骤所使用到的一些技术手段不一样：例如解码协议是自定义的还是使用业界流行的？是文本协议还是二进制协议？处理过程就结合具体业务进行处理等

一般典型的网络服务设计如下图所示：
![classic_service_designs](http://cejdh.img46.wal8.com/img46/533449_20151202165458/144932454766.png)

可见其对每一个请求都新产生一个线程来进行处理，缺点就是线程的创建是消耗不小的系统资源的，且最关键的是如果并发访问突然激增到一定程度，那响应就会大打折扣，甚至由于系统资源不足导致系统崩溃。。。

这里给出自己的Java实现代码如下，比较简单，就是处理每个请求都new一个Thread
#### Server
```java
public class Server implements Runnable{

	private final int port;
	private ServerSocket serverSocket;
	
	public Server(int port){
		this.port = port;
		try {
			this.serverSocket = new ServerSocket(port);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	@Override
	public void run(){
		try {
			while (!Thread.interrupted()) {
				new Thread(new Handler(serverSocket.accept())).start();
			} 
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	public int getPort() {
		return port;
	}
	
	public static void main(String[] args) {
		new Thread(new Server(9001)).start();
	}
	
}
```

#### Handle
```java
public class Handler implements Runnable{

	private final Socket clientSocket;
	
	public Handler(Socket clientSocket){
		this.clientSocket = clientSocket;
	}
	
	@Override
	public void run() {
		int readSize;
		byte[] readBuf = new byte[BUF_SIZE];
		try {
			InputStream in = clientSocket.getInputStream();
			OutputStream out = clientSocket.getOutputStream();
			while ((readSize = in.read(readBuf)) != -1) {
				out.write(readBuf, 0, readSize);
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

}
```

### 高伸缩性系统的目标
基于“每请求每线程”的缺点比较明显且不可接受（严重时系统崩溃），Doug Lea大神提出了构建高伸缩性系统的目标：

* 在激增请求的负载下至少优雅退化吧，即可以相应慢点，但别崩溃（无响应）呀
* 然后自动的增加处理所需资源（例如CPU、内存、磁盘、带宽）来渐进改善上一步中响应缓慢的问题

然后对于系统整体的可用性和性能也提出了一些目标：

* 低延时，其实就是尽量高响应
* 能够满足最大峰值的处理请求，即在访问量突增时不至于宕机
* 可调控的服务处理，例如请求较多时可多加入一些服务处理线程

最后总结了针对设计高伸缩性系统的一个至理名言：
> 分而治之通常都是构建任何高伸缩性系统的最佳解决方案！

### NIO框架的分而治之和事件驱动设计
针对NIO框架的分而治之是把处理过程拆分封装成小的任务——每个任务可以单独无阻塞的进行业务处理；每个任务在其可以立即执行处理的时候就立即执行，即把原来IO阻塞部分交由NIO框架去管理处理，真正的任务只无差别/幂等的处理真正的业务；NIO框架则把IO事件当做触发器去回调相关的任务去执行。

值得庆幸的在java.nio包中有对实现上述的NIO框架处理机制的支持：

1. **非阻塞（Non-blocking）**的读取和写入
2. **分发（dispatch）**IO事件到与其对应的任务并执行处理

这一切看起来都很类似Swing/AWT事件驱动设计：
![awt](http://cejdh.img47.wal8.com/img47/533449_20151202165458/145085344568.png)

而实际的Swing/AWT事件驱动本质上是多生产者/单一消费者模式，即有多个产生事件的地方（各种交互GUI），但是处理事件却只在一个地方（AWT/Event线程从事件队列获取事件一个个处理）。

## Reactor模式和NIO
同Swing/AWT事件驱动设计类似，Reactor模式也是多生产者/单一消费者模式，多个IO（读 /写）事件，但是处理IO事件却只在单一的EventLoop（事件循环）线程中分发给对应的任务处理器处理。基本的Reactor模式（单线程版）如下所示：
![reactor_b](http://cejdh.img47.wal8.com/img47/533449_20151202165458/145085907164.png)

下面来看下基于NIO的Reactor模式和Swing/AWT事件驱动设计的相似对比

| 类名称         | 作用                               | 对应Swing/AWT               |
| ------------- | --------------------------------- | --------------------------- |
| Reactor反应器  | EventLoop及时响应相对于的读/写IO事件 | AWT中的单例事件分发线程        |
|               | 分发到对应Handler处理器上进行业务处理 |                             |
| Handlers处理器 | 处理非阻塞读/写IO事件所对应的业务逻辑 | AWT中的ActionListeners处理器  |
| 事件绑定和处理  | 管理IO读/写事件到对应处理器的绑定     | AWT中的addActionListener绑定 |

然后再看下Java NIO中对实现Reactor提供了哪些支持

| 类名称         | 作用                                            |
| ------------- | ----------------------------------------------- |
| Channels      | 连接支持非阻塞IO的读/写的通道                      |
|               | 例如磁盘文件、网络Socket等都有对应的非阻塞IO的通道类  |
| Buffers       | Channels通道直接用来进行读/写操作的类数组对象       |
| Selectors     | 能知道哪些Channels通道集合存在IO事件               |
| SelectionKeys | 提供IO事件状态信息和IO事件绑定功能的类              |
|               | ![selKeys](http://cejdh.img47.wal8.com/img47/533449_20151202165458/145086171935.png)                     |


### Reactor模式的多线程设计
单线程版Reactor模式是最基本的实现，其核心就是单线程Reactor的EventLoop在不断处理被Selector检测到的IO事件，但缺点也显而易见：

1. 随着客户端的连接数目的增加，如果业务的处理也需要消耗不小时间的话，那仅仅单次的EventLoop循环都会消耗不少时间才能进入下一次循环，导致IO事件阻塞在Selector里不能被及时轮询处理到
2. 而且随着多核CPU的爆发，当拥有多核机器时，应当适当利用多线程能力来分担本来是单线程的Rector，以去应对更多的客户端连接，否则依旧是单线程Rector的话，岂不是浪费了多核这个潮流强项了？

#### Worker Threads
针对第1条缺点引入了Worker Threads（工人线程，消费线程，即有一群工人老早就做好准备处理即将到来任务了）——线程池；理由是Reactor的EventLoop轮询应当快速响应IO触发事件，而不应当消耗在本应该是任务处理器处理的业务上：
![reactor_m1](http://cejdh.img47.wal8.com/img47/533449_20151202165458/145085907171.png)

从上图可以看到其实就是在单线程Reactor的基础上把非IO相关的业务处理部分（decode、computer和encode）拆出来封装成为一个单独的任务（Runnable/命令模式），如此一来在线程池中就能立即进行计算处理了

#### Multiple Reactor Threads
针对第2条Multiple Reactor Threads，即多个Reactor线程；理由是随着客户端连接越来越多，单个Reactor线程处理IO能力会达到饱和状态，在多核机器上看到的现象是只有一个核心利用率较高，其他核心是闲置的，所以应当适当利用多核优势，扩展成匹配CPU核数的多个Reactor，达到分担IO负载的目的：
![reactor_m2](http://cejdh.img47.wal8.com/img47/533449_20151202165458/145085907177.png)

如上图所示，多Reactor根据职责划分为1个mainReactor和多个subReactors，mainReactor主要负责接收客户端连接，因为TCP初始需要经历3次握手才能确认连接，这个连接过程的消耗在客户端较多时其开销是不小的，单独使用mainReactor处理保证了其他已经连接上的客户端在subReactors中不受其影响，从而快速响应处理业务，以此分摊负载并提高系统整体系能

## 代码实现
《Scalable IO in Java》文章中也已经给出示例代码了，基本的Reactor模式的实现直接照搬代码，自己再写点NIO的读/写部分以及process部分即可，所以这里主要把如何实现多Reactor/Selector以及所遇到的坑说一下

### 多Reactor/多Selector
Reactor的实现依赖于NIO的Selector，是Selector去轮询Channel的，所以其实在单线程版Reactor中Reactor有一个Selector，同理既然是多Reactor，那么还是每个Reactor都有自己的Selector和EventLoop轮询。

区别在于：**mainReactor的Selector感兴趣的是ACCEPT操作，而subReactors感兴趣的先是READ然后才是WRITE，然后WRITE完毕后感兴趣的是READ然后再是WRITE。。。如此反复，必须要先READ是为了避免多线程中IO重叠问题，所以需要在代码中区分Reactor是不是mainReactor。**

#### Reactor
```java
public abstract class Reactor extends Thread{

	protected final int port;
	protected final ServerSocketChannel serverChannel;
	protected final boolean isMainReactor;
	protected final boolean useMultipleReactors;
	protected final long timeout;
	protected Selector selector;
	
	public Reactor(int port, ServerSocketChannel serverChannel, boolean isMainReactor, boolean useMultipleReactors, long timeout){
		this.port = port;
		this.serverChannel = serverChannel;
		this.isMainReactor = isMainReactor;
		this.useMultipleReactors = useMultipleReactors;
		this.timeout = timeout;
	}
	
	@Override
	public void run(){
		try {
			init();
			while(!Thread.interrupted()){
				//不可以使用阻塞的select方式，否则accept后subReactor的selector在register的时候会一直阻塞
				//但是修改为带有超时的select或者selectNow后，subReactor的selector在register就不会阻塞了
				//最终选择了带有超时的select是因为使用selectNow的无限循环会导致CPU飙高特别快
				//并且如果使用阻塞的select方式，还需要知道在哪里调用wakeup，否则会一直阻塞，使用非阻塞方式就不需要wakeup了
				//selector.select();
				//if(selector.selectNow() > 0){
				if(selector.select(timeout) > 0){
					log(selector+" isMainReactor="+isMainReactor+" select...");
					Iterator<SelectionKey> keyIt = selector.selectedKeys().iterator();
					while(keyIt.hasNext()){
						SelectionKey key = keyIt.next();
						dispatch(key);
						keyIt.remove();
					}
				}
			}
			log(getClass().getSimpleName()+" end on "+port+" ..."+"\n");
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	private void init() throws IOException{
		selector = Selector.open();
		log(selector+" isMainReactor="+isMainReactor);
		
		if(isMainReactor){
			//serverChannel = ServerSocketChannel.open();
			serverChannel.socket().bind(new InetSocketAddress(port));
			serverChannel.configureBlocking(false);
			SelectionKey key = serverChannel.register(selector, SelectionKey.OP_ACCEPT);
			key.attach(newAcceptor(selector));
			log(getClass().getSimpleName()+" start on "+port+" ..."+"\n");
		}else{
			
		}
		
		//如果使用阻塞的select方式，且开启下面的代码的话，相当于开启了多个reactor池，而不是mainReactor和subReactor的关系了
		//SelectionKey key = serverChannel.register(selector, SelectionKey.OP_ACCEPT);
		//key.attach(newAcceptor(selector, serverChannel));
	}
	
	public abstract Acceptor newAcceptor(Selector selector);
	
	/**
	 * 事件和事件处理器的绑定
	 * <ul>
	 * <li>管理IO读/写事件到事件处理器的一一对应的绑定</li>
	 * </ul>
	 */
	private void dispatch(SelectionKey key){
		Runnable r = (Runnable)key.attachment();
		if(r != null){
			r.run();
		}
	}
	
}
```

1. Reactor中的init方法里的isMainReactor字段即是用来判断是否该Reactor是否为mainReactor的，如果是mainReactor的话，则注册感兴趣的为ACCEPT事件，并且添加Acceptor附件
2. 然后run方法里面的while循环即是EventLoop轮询了，需要注意的是这里有坑：别使用阻塞的select方法，因为该方法会导致accept后subReactor的selector在register的时候会一直阻塞

#### Acceptor
```java
public abstract class Acceptor extends Thread {

	protected final Selector selector;
	protected final ServerSocketChannel serverChannel;
	protected final boolean useMultipleReactors;
	
	public Acceptor(Selector selector, ServerSocketChannel serverChannel, boolean useMultipleReactors){
		this.selector = selector;
		this.serverChannel = serverChannel;
		this.useMultipleReactors = useMultipleReactors;
	}
	
	@Override
	public void run() {
		log(selector+" accept...");
		try {
			 SocketChannel clientChannel = serverChannel.accept();
			 if(clientChannel != null){
				 log(selector+" clientChannel not null...");
				 //如果使用阻塞的select方式，且目的是开启了多个reactor池，而不是mainReactor和subReactor的关系的话，
				 //则下面就不是nextSubSelector().selector，而是改为传递当前实例的selector对象即可
				 handle(useMultipleReactors ? nextSubReactor().selector : selector, clientChannel);
			 }else{
				 log(selector+" clientChannel is null...");
			 }
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	/**
	 * 在每个具体的Handler下调用run方法是为了令其从connecting状态变为reading状态，
	 * 和原pdf版本下的做法是一样的，只不过原pdf版本是在构造函数直接修改设置了感兴趣为read事件
	 */
	public abstract void handle(Selector selector, SocketChannel clientSocket);

}
```

Acceptor是被mainReactor当做ACCPET的附属对象，所以当有连接接收过来了，就使用handle方法处理，handle方法的Selector参数即可传递subReactors的Selector，然后先对READ感兴趣即可。

#### Handle
```java
public abstract class Handler extends Thread {

	private enum State{
		CONNECTING(0),
		READING(SelectionKey.OP_READ),
		PROCESSING(2),
		WRITING(SelectionKey.OP_WRITE);
		
		private final int opBit;
		private State(int operateBit){
			opBit = operateBit;
		}
	}
	
	private State state;
	protected final SocketChannel clientChannel;
	protected final SelectionKey key;
	
	protected final ByteBuffer readBuf;
	protected final StringBuilder readData = new StringBuilder();
	protected ByteBuffer writeBuf;
	
	public Handler(Selector selector, SocketChannel clientChannel){
		this.state = State.CONNECTING;
		SelectionKey key = null;
		try {
			clientChannel.configureBlocking(false);
			//这里在使用subSelector的时候会阻塞，为什么？是因为使用了阻塞的select方法，非阻塞的才可以
			//但如果使用reactor池的话，那是因为需要serverChannel注册selector的accept事件！？必须对应上才可以通过，否则阻塞
			key = clientChannel.register(selector, this.state.opBit);
			key.attach(this);
		} catch (Exception e) {
			e.printStackTrace();
		}
		this.clientChannel = clientChannel;
		this.key = key;
		this.readBuf = ByteBuffer.allocate(byteBufferSize());
		log(selector+" connect success...");
	}
	
	@Override
	public void run() {
		switch (state) {
			case CONNECTING:
				connect();
				break;
			case READING:
				readAndProcess();
				break;
			case WRITING:
				write();
				break;
			default:
				err("\nUnsupported State: "+state+" ! overlap processing with IO...");
		}
	}
	
	private void connect() {
		interestOps(State.READING);
	}

	/**
	 * But harder to overlap processing with IO<br/>
	 * Best when can first read all input a buffer<br/>
	 * <br>
	 * That why we used synchronized on read method!<br/>
	 * Just to protected read buffer And handler state...<br/>
	 * <br>
	 * 其实就是害怕重叠IO和工作线程处理不一致：例如Reactor单线程读某个key的IO完毕后立马开启工作线程的处理，
	 * 紧接着Reactor单线程处理第二个IO key的时候发现还是之前的那个key的读IO事件，但是之前同一个key的处理还未完成，
	 * 不等待之前的处理完成的话，就会出现多个线程同时访问修改Handler里面数据的情况，导致出错，
	 * 但是最好先把数据都全部读入buffer中就可以规避了！？
	 * 
	 * <p>此处的synchronized同步是为了防止state状态以及读写buffer在多线程访问中出现读脏数据，
	 * Debug调试的时候同时访问一个SelectionKey有2个线程：
	 * <br>1、Reactor单线程
	 * <br>2、读数据完毕后多线程处理的话，线程池里面执行processAndHandOff的线程
	 * <br>
	 * 不能单一使用volatile或者原子变量的原因是因为该方法为复合操作（check and act）
	 */
	private synchronized void readAndProcess(){
		doRead();
		doProcess();
	}
	
	private void doRead(){
		int readSize;
		try {
			while((readSize = clientChannel.read(readBuf)) > 0){
				readData.append(new String(Arrays.copyOfRange(readBuf.array(), 0, readSize)));
				readBuf.clear();
			}
			if(readSize == -1){
				disconnect();
				return;
			}
		} catch (IOException e) {
			e.printStackTrace();
			disconnect();
		}
		
		log("readed from client:"+readData+", "+readData.length());
	}
	
	private void doProcess(){
		if(readIsComplete()){
			state = State.PROCESSING;
			processAndInterestWrite();
		}
	}
	
	/**
	 * 处理过程可能是比较耗时的，所以可考虑将其交由线程池处理，处理完毕后才注册感兴趣的write事件<p>
	 * 然而正是由于交由线程池处理所以可能造成重叠IO的多线程处理的状态问题，最好能一次性全部读入buffer，否则考虑同步状态处理问题
	 */
	private void processAndInterestWrite(){
		Processor processor = new Processor();
		if(useThreadPool){
			execute(processor);
		}else{
			processor.run();
		}
	}
	
	private final class Processor implements Runnable{
		@Override 
		public void run() { 
			processAndHandOff(); 
		}
	}
	
	private synchronized void processAndHandOff(){
		if(process()){
			interestOps(State.WRITING);
		}
	}
	
	//TODO 修改为复用output，即当output容量不足的时候就反复write，而不是每次都使用wrap来new一个新的
	public boolean process(){
		log("process readData="+readData.toString());
		if(isQuit()){
			disconnect();
			return false;
		}
		
		writeBuf = ByteBuffer.wrap(readData.toString().getBytes());
		readData.delete(0, readData.length());
		return true;
	}
	
	private void write(){
		try {
			do{
				clientChannel.write(writeBuf);
			}while(!writeIsComplete());
		} catch (IOException e) {
			e.printStackTrace();
			disconnect();
		}
		
		String writeData = new String(Arrays.copyOf(writeBuf.array(), writeBuf.array().length));
		log("writed to client:"+writeData+", "+writeData.length());
		interestOps(State.READING);
	}
	
	/**
	 * 事件和事件处理器的绑定
	 * <ul>
	 * <li>类似AWT中的addActionListener添加监听器/观察者</li>
	 * </ul>
	 * 不需要重置key的附件（key.attach）是因为key一直绑定使用的是当前this实例，
	 * 在Reactor dispatch的时候如果是接受（accept）该附件就是Acceptor实例，
	 * 否则就是绑定到该key的同一个Handler实例
	 */
	private void interestOps(State state){
		this.state = state;
		key.interestOps(state.opBit);
	}
	
	public boolean isQuit(){
		return false;
	}
	
	private void disconnect(){
		try {
			clientChannel.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		log("\nclient Address=【"+clientAddress(clientChannel)+"】 had already closed!!! ");
	}
	
	private static SocketAddress clientAddress(SocketChannel clientChannel){
		return clientChannel.socket().getRemoteSocketAddress();
	}
	
	public abstract int byteBufferSize();

	public abstract boolean readIsComplete();

	public abstract boolean writeIsComplete();

}
```

具体做的事情就像前面说的，先对READ感兴趣，然后是状态机的判断和处理，注意的地方使用了synchronized同步避免IO重叠并起到了保护状态机的作用，注释上也已经做出描述了。

其中有些方法是abstract是因为想自己写一个类NIO框架，达到根据应用场景的不同可以自行实现所需要的方法，当前仅仅写了个Echo（回显）和Enter（回车作为结束符）显示消息的例子，具体代码已经放到本人GitHub上：[scalableIO](https://github.com/whg333/learning-java-socket/tree/master/src/scalableIO)

### 参考
* [nio框架中的多个Selector结构](http://www.iteye.com/topic/482269)
* [Java NIO之多个Selector的实现](http://blog.csdn.net/jjzhk/article/details/39553613)

（完）