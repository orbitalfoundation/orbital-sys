# todo dec 3 2024

	- introduce fully qualified inputs and outputs where each object has arbitrary input or output functions
	  this will help compatibility with visual scripting tools such as behave graph
	  this also means revising and correcting the filtering logic which is lazily written right now

	- introduce some kind of test suite

	- look at an issue where late registered observers miss early fired events
	  at least the initial batch of observers should all be registered before events are propagated

	- consider adding some more built in capabilities such as an in memory db or indexdb, possibly even mongo bindings

	- perhaps sys can accept a startup profile - not everybody wants 'tick'

