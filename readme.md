# Orbital Sys Component

## Overview

This is a publish/subscribe messaging service intended to decouple and orchestrate the behavior of other components in an application.

The focus is for javascript applications. It can be used with or without React.

## Example

A developer publishes state as follows:

	import {sys} from 'orbital-sys'

	const account = {
		name: "Mary",
		description: "Mary had a little lamb"
	}

	const blob = { account }

	sys.resolve(blob)

And a developer observes state as follows:

	const blob = {
		resolve: async (blob) => {
			console.log("We saw some state moving past",blob)
		}
	}

	sys.resolve(blob)

## Going a bit further

A useful way of thinking about state is to define an 'entity' as a collection of granular and reusable 'components'.

For example:

	const uuid = generateUUID()

	const layout = '<h1>${account.name}</h1><p>${account.description}</p>'

	const resolve = (blob) => {
		console.log("noticed an event",blob)
	}

	sys.resolve({
		uuid,
		account,
		layout,
		resolve
	})

In this more complex example a uuid observer can catch this entity flying past and register it in database (or update the database). An account entity can perhaps grant a public/private keypair to the account. A layout entity can paint that entity as part of a display. And a resolver can pass specific worthwhile events to the entity itself.

## Limitations today

This messaging service is experimental with many limitations but there is a clear path to correcting them without breaking the simplicity of basic examples. Many will be addressed over time:

1) Observers are passed state in the order registered ... later it will be possible to insert observers in an arbitrary order.

2) All observers observe all state... later improved filtering will be supported.

3) The event pipeline cannot be stopped... later it will be possible to abort events on the event pipeline.

4) Informal schemas... later a formal schema typing scheme and reserved namespace will be introduced to reduce developer error.

5) There are many other similar and slightly competing patterns such as mobx, flecs, react, feathers, croquet, jazz tools... unfortunately it is difficult to reason about all the other framework choices.

6) Observers can suspend the entire state of the system using async/await ... this is a design choice for now.

7) It is possible to create cyclical loops that can crash the system ... later a queue will be introduced where all events are published to the queue in one round and then evaluated.

8) State is not cloned by default; downstream observers can modify state ... this is intentional for now to allow local state to be authoritative, but later a concept of cloning will be introduced to prevent third parties from polluting local state.

9) Explicit invocation of sys.resolve() is required rather than using some kind of fancy grammar built in observer pattern ... this will be improved later.

## Event Sourced Programming Paradigm

React popularizes a data-driven or 'declarative' programming paradigm based on the observation that if the state is well defined then the view is simply an 'effect' of that underlying state. See [React](https://en.wikipedia.org/wiki/React).

Going further, an agent based messaging scheme, or event-sourced programming paradigm accumulates the state of the system over time as a series of messages. These patterns are based on work by researchers such as Alan Kay.
