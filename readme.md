# Orbital-Sys

## Overview

An experimental publish/subscribe (pub/sub) messaging service written in javascript. It intended to decouple and orchestrate the behavior of other services within an application.

## Example

A piece of code can publish state:

```
	import {sys} from 'orbital-sys'

	const account = {
		name: "Mary",
		description: "Mary had a little lamb"
		status: "new"
	}

	const blob = { account }

	sys(blob)
```

And another piece of code can react to state:

```
	const resolve = async (blob) => {
		if(blob.account) {
			console.log("We saw an account!",blob)
		}
	}

	const blob = {
		resolve
	}

	sys(blob)
```

The sys.resolve() method acts as a single point of entry for most activity; events are published here, and subscribing to events is registered here as well.

## ECS Pattern

This pub/sub library encourages a specific pattern of publishing an entity decorated with components. Rather than publishing "jump" one publishes { action: "jump" }.

The ECS (entity component system) pattern can be thought of as a semantic bundle, or sentence, formed out of a vocabulary, expressing concepts from granular composition. Filtering on components is an organizing principle. For more on this topic this (unrelated) ECS service explores the concepts well: https://www.flecs.dev/flecs/ .

Richer examples of using entities would be to describe not just one property but several related properties:

```
	const id = generateUUID()

	const resolve = (blob) => {
		console.log("noticed an account fly past",blob)
	}
	resolve.filter = { physics: { collision: true } }

	const entity = {
		id,
		physics: { mass: 12 },
		appearance: { geometry: "sphere" },
		stats: { wisdom: 13, charisma: 24 }
		resolve
	}

	sys(entity)
```

In this example observers can catch this state or entity flying past and perform several operations in a row. A database observer can store it. An account observer can perhaps grant a public/private keypair to the account. A layout observer can paint that entity as part of a display. And the entity itself can also observe events from other sources.

Important concepts such as removing observers, or more efficient filtering can be added as well without breaking this pattern.

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

## Resolver Order and Simple Filters

Resolvers can have relative order to each other. Also a resolver can have a 'simple filter' which matches the key names of the supplied object:

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

Currently there is no strategy to deal with out of order resolver registration. If you have events intended for a resolver, but that resolver was not registered yet, those events are not handled later when the resolver shows up.

## Schemas

As a developer aid it is possible to reserve object schemas. This helps developers avoid colliding with each other on a reserved namespace for an ecs vocabulary:

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

## Aborting

Calling sys.resolve({mydata:true}) will call all unfiltered resolvers, or all resolvers that are specifically filtering for 'mydata'. Any resolver in the chain can stop the rest of the chain by writing 'force_sys_abort' into returned state (for now):

```
	const resolve = (blob)=> {
		return { force_sys_abort: true }
	}
```

## Modifications

Every resolver gets a handle on durable persistent state that is instantiated once somewhere. That state can be modified, and resolvers can modify state before the next resolver gets that state.

```
	const resolver1 = (blob) => {
		blob.my_special_value = 12
	}
	const resolver2 = (blob) => {
		console.log(blob.my_special_value)
	}
	sys.resolve({resolve:resolver1},{resolve:resolver2},{myevent:true})
	// prints '12'
```

## Multiple Instances

Multiple independent instances of sys can be created if desired.

This pubsub service declares globalThis.sys - so one doesn't even have to import the system itself in every file.

However there are cases where developers may want to have two or more instances of sys running at the same time. There are serveral variations in how sys() can be used to support this:

```

	// somebody has to at least once somewhere import sys
	import 'orbital-sys'

	// sys can be invoked anywhere; leveraging globalThis.sys
	sys(blob)

	// globalThis can be explicitly cited for clarity
	globalThis.sys(blob)

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

	sys1({resolve})
	sys1({account:{name:"new account",status:"new"}})

```

## Async

Sys events can technically await but it's not predictable; the internal architecture uses a queue that may return early if previous work is still being done. Resolvers themselves can be async/await. It's probably expensive for the whole system to await for a resolver and risky to use.

```
	const resolve = async (blob) => { const handle = await fetch(blob.fetch); console.log(handle); }
	resolve.filter = { fetch: true }
	const results = await sys.resolve({resolve},{fetch:"https://news.com"})
```

## Manifests

There are a few built in or reserved pubsub resolvers - one of which is 'load'. This forms a manifest grammar that allows for inhaling of larger collections of state from a file.

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





