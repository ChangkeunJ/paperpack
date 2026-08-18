import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isComplete, nextUnanswered, prune, type Question } from './interview.js'

type A = { name: string; agrees: boolean; amount: number; reason: string }
const questions: readonly Question<A>[] = [
  { id: 'name', type: 'text', promptKey: 'q.name' },
  { id: 'agrees', type: 'boolean', promptKey: 'q.agrees' },
  { id: 'amount', type: 'number', promptKey: 'q.amount' },
  { id: 'reason', type: 'text', promptKey: 'q.reason', when: a => a.agrees === false },
]

test('false and zero are answers, a blank string is not', () => {
  const answers = { name: 'a', agrees: false, amount: 0, reason: 'b' }
  assert.ok(isComplete(questions, answers))
  assert.equal(nextUnanswered(questions, { ...answers, name: '' })?.id, 'name')
  assert.equal(nextUnanswered(questions, { ...answers, reason: '  ' })?.id, 'reason')
})

test('an answer to a question made unreachable is dropped', () => {
  const pruned = prune(questions, { name: 'a', agrees: true, amount: 1, reason: 'stale' })
  assert.deepEqual(pruned, { name: 'a', agrees: true, amount: 1 })
})
