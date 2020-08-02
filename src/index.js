import { updateDomains } from './updateDomains'
import { init } from './init'

init().then(updateDomains)
