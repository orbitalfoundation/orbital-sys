# Orbital-Sys

## Overview

An experimental publish/subscribe (pub/sub) messaging service written in javascript. It intended to decouple and orchestrate the behavior of other services within an application.

## Installing

This can be imported as a module on the command line with npm or yarn:

```
	npm i 'orbital-sys'
```

Or you can import from a cdn:

```
	import {sys} from 'https://cdn.jsdelivr.net/npm/orbital-sys@1.0.4/sys.js/+esm'
```

## Usage

You can react to state flowing through the pub/sub network by registering an observer or 'resolver' in a javascript file like so:

```
	import {sys} from 'https://cdn.jsdelivr.net/npm/orbital-sys@1.0.3/sys.js/+esm'

	const resolve = async (blob) => {
		if(!blob.account) return
		console.log("We saw an object with an account property fly past!",blob)
	}

	sys({resolve})
```

And you can publish state to registered pub/sub observers like so:

```
	const account = {
		name: "Mary",
		description: "Mary had a little lamb"
		status: "new"
	}

	sys({account})
```

## Conventional usage

The method "sys()" is registered on globalThis.sys(). You can also use sys.resolve(arguments) if you wish. Sys() is a single point of entry for most activity. This pub/sub framework deviates from the expected pattern of sys.subscribe(filter,handler) and sys.publish(message) because of an idea of 'manifests' where you can inhale documents that describe state collections declaratively.

## Simple Filters

A resolver can have a 'simple filter' which matches the key names of the supplied object. This may be made more fancy later.

```
	function resolve(blob) {
		console.log('got an event with kittens',blob)
	}
	resolve.filter = { kittens: {} }

	sys({resolve})
	sys({kittens:'purr'})
	sys({dogs:'woof'})
```

## Live uncloned state

State that is passed through sys() is 'live' and can be altered. I had been cloning state earlier but I found it useful to alter state live insitu - there are risks here of accidentally altering state somewhere far away - but also benefits. Later I may introduce a tag to indicate if an object should be cloned or is immutable.

```
	// add a sleep observer
	const resolve = (blob)=> {
		blob.sleep.sleepyness++
	}
	resolve.filter = { sleep: {} }
	sys({resolve})

	// add a kitten
	const kitten = {
		eats: {
			food: 12,
		},
		climbs: {
			speed: 14,
		},
		sleep: {
			sleepyness: 0
		}
	}
	sys(kitten)

	// this should report 1
	console.log("kitten is getting sleepy",kitten.sleep.sleepyness)
```

## State modifications are consecutive and 'live' as it filters through observers

Every resolver gets a handle on durable persistent state that is instantiated once somewhere. That state can be modified, and resolvers can modify state before the next resolver gets that state.

```
	const resolver1 = (blob) => {
		blob.my_special_value = 12
	}
	const resolver2 = (blob) => {
		// prints '12'
		console.log(blob.my_special_value)
	}
	sys.resolve({resolve:resolver1},{resolve:resolver2},{anyevent:'tickle'})
```

## ECS Pattern

This pub/sub library encourages a specific pattern of publishing an 'object decorated with properties' or in actor nomenclature an 'entity decorated with components'. Rather than publishing "jump" one publishes { action: "jump" }.

The ECS (entity component system) pattern can be thought of as a semantic bundle, or sentence, formed out of a vocabulary, expressing concepts from granular composition. Filtering on components is an organizing principle. It's worth googling more on the ECS pattern.

Richer examples of using entities would be to describe not just one property but several related properties:

```
	const resolve = (blob) => {
		console.log("noticed something with physics fly past",blob)
	}
	resolve.filter = { physics: { } }
	sys({resolve})

	sys({
		id:'rooms/dragons-lair/treasurechest-3',
		physics: { mass: 12 },
		appearance: { geometry: "sphere" },
		stats: { wisdom: 13, charisma: 24 }
	})
```

In this example observers can catch this state or entity flying past and perform several operations in a row. A database observer can store it. An account observer can perhaps grant a public/private keypair to the account. A layout observer can paint that entity as part of a display. And the entity itself can also observe events from other sources.

Important concepts such as removing observers, or more efficient filtering can be added as well without breaking this pattern.

## Resolvers are blind to self, order dependent, and resolve only on past state

The resolver is not invoked on itself. At the moment this is on purpose and special code is written to make sure that resolvers do not see themselves. This may change - I can see arguments for doing the opposite:

```
	const resolve = (blob) => {
		console.log("noticed something with physics fly past",blob)
	}
	resolve.filter = { physics: { } }
	sys({
		resolve,
		physics: {}
	})
	// the resolver will not trigger even though the object has a physics property
```

Also worth re-iterating that a resolver registered *after* some state is published does not see that state. Right now the system is order-dependent. This may change because I do feel it is something of a design defect to have order dependent inflation of a whole system. I may have a state replay or some kind of deferred registration of state after resolvers.

Finally it is worth noting that a given call to sys() could register multiple new resolvers, but for the purposes of handling a single event those new resolvers are ignored. This may change.

## Unrolling

As a convenience you can pass multiple items, or even arrays to sys.resolve. These all produce the same outcomes:

```
	const alpha = { hello: true }
	const beta = { hello: true }
	const gamma = { hello: true }
	const delta = { hello: true }

	sys.resolve(alpha,beta,gamma,delta)
	sys.resolve([alpha,beta,gamma,delta])
	sys.resolve([alpha,beta],gamma,[delta])
```

## Resolver Order

Resolvers can have relative order to each other:

```
	const message = { test: true }
	const alpha = {
		uuid:"alpha",
		physics: { mass: 123 },
		resolve: ()=> { console.log("alpha hello") }
	}
	alpha.resolve.filter = message
	const beta = {
		uuid:"beta",
		resolve: ()=> { console.log("beta hello") }
	}
	beta.resolve.before = "alpha"
	beta.resolve.filter = message
	sys.resolve([alpha,beta,message])
	// prints "beta hello" then "alpha hello"
```

Currently there is no strategy to deal with out of order resolver registration. If you have events intended for a resolver, but that resolver was not registered yet, those events are not handled later when the resolver shows up. This probably needs work.

## Resolver singleton

At the moment a given resolver can be registered only once - I detect if the actual function object is already registered. This may change. I can see an argument for recycling a single resolver on many object instances.

## Schema namespace reservation

As a developer aid it is possible to reserve component names on the root namespace of an entity. This helps developers avoid colliding with each other on a reserved namespace for an ecs vocabulary. Further we imagine that with a formal schema library it would be possible to fully declare the entire set of properties of any given component, but this is not enforced yet.

Schemas are used right now for simple filters.

Also schema reservation does prevent developers from colliding with each other - if two separate developers attempt to resolve the same schema an error message is reported (arguably an exception should be thrown but we do not do that yet).

```
	const physics = {
		uuid:"physics",
		resolve: () => { console.log("physics system for my game got a tick event") }
	}
	physics.resolve.filter = { tick: true }
	physics.resolve.schema = { physics: true }

	const school = { 
		uuid:"other",
		resolve: () => { console.log("physics class for my school got a calendar event") }
	}
	school.resolve.schema = { physics: true }

	sys.resolve(physics,school)
	// this reports an error because the concept of 'physics' has a namespace collision
```

There are formal schema libraries for javascript and arguably one could be used. This may be improved.

## Reserved terms

These already mean something and cannot be used for new purposes:

```
	const myobject = {
		uuid,
		resolve,
		tick,
		load,
		parent,
		children,
		obliterate
	}
```

There is some argument that the kernel should form a separate namespace outside of the user namespace - or at least to try to consolidate these as much as possible to reduce pressure on user namespaces. This may be revisited. For now these are reserved.

## Aborting

Calling sys.resolve({mydata:true}) will call all unfiltered resolvers, or all resolvers that are specifically filtering for 'mydata'. Any resolver in the chain can stop the rest of the chain by writing 'force_sys_abort' into returned state (for now):

```
	const resolve = (blob)=> {
		return { force_sys_abort: true }
	}
```

## Multiple Instances

Multiple independent instances of sys can be created if desired.

Right now there is some shared state between instances. A cloning concept must be introduced for concepts like { load }. @todo

By default globalThis.sys() is automatically created - so developers do not have to import sys itself over and over.

However there are cases where developers may want to have two or more instances of sys running at the same time. There are serveral variations in how sys.resolve() can be used to support this:

```

	// somebody has to at least once somewhere import sys
	import 'orbital-sys'

	// sys can be invoked anywhere; leveraging globalThis.sys
	sys.resolve(blob)

	// globalThis can be explicitly cited for clarity
	globalThis.sys.resolve(blob)

	// observers typically have a 'resolve' so sys.resolve() is also valid notation
	sys.resolve(blob)

	// multiple versions of sys are possible; you must then use the passed sys reference

	import { produceSys } from 'orbital-sys'

	const sys1 = produceSys()
	const sys2 = produceSys()

	sys1.version = "first copy"
	sys2.version = "second copy"

	const resolve = (blob,sys) => {
		assert(sys.version === "first copy")
		if(!blob.account || !blob.account.status==='new') return
		sys.resolve({html:{parent:null,div:`Name: ${blob.account.name} registered`}})
	}

	sys1.resolve({resolve})
	sys1.resolve({account:{name:"new account",status:"new"}})

```

## Async

Sys events can technically await but it's not predictable; the internal architecture uses a queue that may return early if previous work is still being done. Resolvers themselves can be async/await. It's probably expensive for the whole system to await for a resolver and risky to use.

```
	const resolve = async (blob) => { const handle = await fetch(blob.fetch); console.log(handle); }
	resolve.filter = { fetch: true }
	const results = await sys.resolve({resolve},{fetch:"https://news.com"})
```

We need async because there are cases where blocking is important, but the pattern itself just doesn't feel totally satisfactory - here is some commentary on it as a whole: https://lucumr.pocoo.org/2024/11/18/threads-beat-async-await/ .

## Manifests

Manifests are a key design feature but are not heavily discussed yet. I will discuss these more in the future. For now, it is worth noting that there are a few built in or 'reserved' pubsub resolvers whose schemas occupy root namespaces that you cannot use yourself. One of these is 'load'. This forms a manifest grammar that allows for inhaling of larger collections of state from a file.

```
	sys.resolve({load:"./configuration.js"})
```

## Tick

Another built in pubsub resolver is the tick event - which can be used to drive systems

```
	const resolve = ()=>{ console.log('tick occured') }
	resolve.filter = { tick: true }
	sys.resolve({resolve})
```

# Notes, Limitations and issues

## Simple

The core library is minimalist. Typescript is not required, schema declarations are optiona, type-safety is optional, there is little error checking.

## Infinite loops

It is definitely possible to create infinite loops for example that can lock up your application.

## Uncloned state

State is not cloned by default; downstream observers can modify state ... this is intentional for now to allow local state to be authoritative, but later a concept of cloning will be introduced to prevent third parties from polluting local state.

## Explicit calls to sys.resolve()

Explicit invocation of sys.resolve() is required rather than using some kind of fancy grammar built in javascript signals pattern ... this will continue to be studied

# Design & Theory

## Forward Imperative Programming

In classical construction of software developers use a **forward imperative** programming style. Imports are explicit and code become a large tangle of imports and direct function calls. Technical debt accumulates here, and refactoring can become increasingly difficult as code grows.

```
// one.js - source code for function one

export function one(argument1,argument2,argument3) {
}
```

```
// two.js - source code for function two

import { one } from 'one.js'

function two() {
	one(1,2,3)
}
```

## The Pub/Sub pattern

There a variety of patterns to decouple explicit relationships. There is an emphasis on well defined APIs and on formalization of object schemas, powerful tooling for development and debugging, code-completion tools and the like. Pub/sub is simply another technique for tackling code complexity.

Generally accepted benefits of pub/sub are:

1. **Decoupling of Components**: Publishers and subscribers are independent, leading to a modular architecture where components can be developed, tested, and maintained separately.

2. **Scalability**: Easily scales horizontally. You can add more publishers or subscribers without significantly affecting system performance.

3. **Asynchronous Communication**: Supports asynchronous message passing, allowing components to operate at their own pace without blocking.

4. **Eliminates Polling**: Systems can react to state changes immediately, reducing the need for resource-intensive polling mechanisms.

5. **Easier Service Discovery**: Publishers broadcast on a topic without needing to know the subscribers. Any interested party can subscribe to topics and react accordingly.

6. **Reduced Cognitive Load**: Developers can focus on publishing state changes without worrying about how those changes will produce effects.

7. **Flexibility and Extensibility**: New functionalities can be added by introducing new subscribers or publishers without modifying existing code.

8. **Parallel Processing**: Subscribers operate independently, allowing messages to be processed in parallel, improving throughput and performance.

9. **Supports Multiple Message Patterns**: Accommodates various messaging patterns like one-to-many, many-to-many, and broadcast messaging.

10. **Event-Driven Architecture Support**: Natural fit for event-driven architectures, enabling systems to react to events in real-time.

However there are risks as well in the pub/sub pattern:

1. **Debugging Complexity**: Decoupled nature can make debugging more challenging. Tracing the flow of messages requires additional tooling.

2. **Latency**: Introducing a messaging layer can add latency, which may not be acceptable in time-sensitive applications.

3. **Message Delivery Guarantees**: Ensuring messages are delivered exactly once, in order, and without loss can be complex.

4. **Overhead of Message Brokers**: May rely on external message brokers, adding operational overhead and potential points of failure.

5. **Resource Consumption**: Inefficient subscribers can lead to message queue build-up, consuming resources.

6. **Security Concerns**: Without proper mechanisms, unauthorized subscribers could receive sensitive information.

7. **Lack of Transaction Support**: Coordinating transactions across publishers and subscribers can be difficult.

8. **Unpredictable Execution Order**: Nondeterministic order can lead to race conditions.

9. **Complex Error Handling**: Handling exceptions and errors can be more complicated.

10. **Versioning and Compatibility Issues**: Maintaining compatibility between different versions of publishers and subscribers can be challenging.

## History of the Pub/Sub pattern

It's worth noting that these are not new ideas. In the 1980's David Gelernter explored these topics in 'Linda' - a coordination language : https://www.windley.com/archives/2004/08/linda_and_servi.shtml . The Observer Pattern (related to pub/sub) was formalied in "Design Patterns": https://en.wikipedia.org/wiki/Observer_pattern . Early tools like the Java Message Service formalized pub/sub as an idea, and we see it now in services like Google Cloud and AWS SNS. Other examples include Apache Kafka, MQTT, Redis. Alan Kay notably touched on many of these ideas, and today we also see tools like flecs, jazz-tools, croquet, feathers, and several pubsub / observer libraries on npm.

## Looking forward

Pub/sub dovetails with an idea of declarative or 'data driven' design - which is the more general observation that developers want to be able to express the 'state' of the system concretely, and have the 'view' or other 'effects' fall out of that well formed state.

React is probably the most popular example of this data-driven or 'declarative' programming paradigm. See [React](https://en.wikipedia.org/wiki/React). However React is often used for HTML, and it tends to bring along a suite of other concepts that are unrelated; ideas around JSX, pre-compilation, a separation of code into a source and a compiled output, ideas around minimal repainting and component isolation.

The emphasis here is purely on describing how data flows through systems. On organizing state as bundles, driving that state through a pipeline, and producing effectively an 'event sourced' view or 'data driven' set of effects or reactions in predictable ways. There's an overarching vision of being able to have declarative 'manifests' to represent the state of a system, can can be inhaled to produce that system.





