
const isServer = (typeof window === 'undefined') ? true : false

export let minimumMilliseconds = 10
export let desiredFramerate = 1000

//
// client and server tick helper - this 
//

async function _run(sys) {

	// counter
	const counter = sys._tickCounter++ || ( sys._tickCounter = 1)

	// when did we last run?
	const timePrevious = sys._timePrevious || 0

	// what time is it now?
	const time = performance.now()

	// how long ago was that?
	const delta = timePrevious ? time - timePrevious : desiredFramerate

	// this is the event to publish - i avoid giving it a uuid since i do not want it to persist
	const tick = {uuid:`orbital/sys/tick/${counter}`,name:'tick',time,delta,tick:true }

	// must await - even though we could be queued; because we want to only run at a certain frequency
	await sys(tick)

	// remember last time
	sys._timePrevious = time

	// estimate sleep time
	const elapsed = performance.now() - time

	let sleep = elapsed < desiredFramerate ? (desiredFramerate - elapsed) : 0 
	if(sleep < minimumMilliseconds) sleep = minimumMilliseconds

	// call myself when time for next frame
	const done = () => { _run(sys) }

	// on the client rely on built in capabilities, on the server just try sleep
	if(!isServer && window.requestAnimationFrame) {
		window.requestAnimationFrame(done)
	} else {
		console.log(sleep)
		setTimeout(done,sleep)
	}
}

const uuid = "orbital/sys/tick"

///
/// tick is a way that other observers can run in a controlled manner; it implements the "S" part of ECS
///

const resolve = async function(blob,sys) {
	return
	if(sys._tickInitialized) return
	sys._tickInitialized = true
	_run(sys)
}

export default { uuid, resolve }
