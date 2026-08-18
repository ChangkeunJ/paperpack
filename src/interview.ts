export type Answers = Record<string, unknown>

export type Option = { value: string; labelKey: string }

export type Question<A extends Answers = Answers> = {
  id: keyof A & string
  type: 'choice' | 'number' | 'boolean' | 'text'
  promptKey: string
  helpKey?: string
  options?: readonly Option[]
  /** Asked only when this holds. Absent means always asked. */
  when?: (answers: Partial<A>) => boolean
}

export function visibleQuestions<A extends Answers>(
  questions: readonly Question<A>[],
  answers: Partial<A>,
): Question<A>[] {
  return questions.filter(q => !q.when || q.when(answers))
}

export function nextUnanswered<A extends Answers>(
  questions: readonly Question<A>[],
  answers: Partial<A>,
): Question<A> | undefined {
  // A blank string is not an answer, but false and zero are.
  return visibleQuestions(questions, answers).find(q => {
    const v = answers[q.id]
    return v === undefined || (typeof v === 'string' && v.trim() === '')
  })
}

export function isComplete<A extends Answers>(
  questions: readonly Question<A>[],
  answers: Partial<A>,
): boolean {
  return nextUnanswered(questions, answers) === undefined
}

/**
 * Drop answers whose question is no longer reachable. Going back and changing an
 * early answer must not leave a stale answer feeding the calculation.
 */
export function prune<A extends Answers>(
  questions: readonly Question<A>[],
  answers: Partial<A>,
): Partial<A> {
  let kept = { ...answers }
  // Visibility can cascade, so settle it rather than making a single pass.
  for (;;) {
    const visible = new Set(visibleQuestions(questions, kept).map(q => q.id))
    const next = Object.fromEntries(
      Object.entries(kept).filter(([id]) => visible.has(id)),
    ) as Partial<A>
    if (Object.keys(next).length === Object.keys(kept).length) return next
    kept = next
  }
}
