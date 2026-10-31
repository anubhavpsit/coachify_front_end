import { formatDate } from '@/utils/date'
import type { Assessment } from '../services/assessmentsService'

/**
 * The four steps of one test, in order — same words on web and app
 * (coachify_react_native/src/utils/assessmentSteps.ts).
 *   action  = someone must act now (the first one is "next")
 *   waiting = out of this user's hands
 *   later   = can't usefully happen yet
 *   optional / done
 */
export type StepKey = 'details' | 'students' | 'paper' | 'results'
export type StepState = 'done' | 'action' | 'waiting' | 'later' | 'optional'
export type TestStep = { key: StepKey; title: string; status: string; state: StepState }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function testSteps(a: Assessment, isAdmin: boolean): TestStep[] {
  const p = a.progress
  const total = p ? p.total - p.cancelled : 0
  const papers = a.paper_questions_count ?? 0
  const left = p ? p.awaiting_results + p.today : 0

  const details: TestStep = a.is_admin_approved
    ? { key: 'details', title: 'Test details', state: 'done', status: `Approved · ${a.total_marks} marks` }
    : isAdmin
      ? { key: 'details', title: 'Test details', state: 'action', status: "Waiting for your approval. Students can't see this test yet." }
      : { key: 'details', title: 'Test details', state: 'waiting', status: "Waiting for admin. Students can't see this test yet." }

  const students: TestStep =
    total > 0
      ? { key: 'students', title: 'Students', state: 'done', status: `${plural(total, 'student')} assigned${p?.next_date ? ` · next test ${formatDate(p.next_date)}` : ''}` }
      : { key: 'students', title: 'Students', state: 'action', status: 'No students yet.' }

  const paper: TestStep = a.question_paper_released_at
    ? { key: 'paper', title: 'Question paper', state: 'done', status: 'Students can see it now.' }
    : a.question_paper_approved_at
      ? { key: 'paper', title: 'Question paper', state: 'done', status: 'Ready. Students see it after everyone has sat the test and a result is saved.' }
      : papers > 0
        ? { key: 'paper', title: 'Question paper', state: 'action', status: `${plural(papers, 'question')}, still a draft. Students won't see it until you mark it ready.` }
        : { key: 'paper', title: 'Question paper', state: 'optional', status: 'Optional. Build one from the question bank, or upload a file.' }

  let results: TestStep
  if (total === 0) results = { key: 'results', title: 'Results', state: 'later', status: 'After students are assigned and the test is over.' }
  else if (p?.stage === 'needs_results') results = { key: 'results', title: 'Results', state: 'action', status: `${plural(left, 'student')} still to enter${p.oldest_pending_date ? `, since ${formatDate(p.oldest_pending_date)}` : ''}.` }
  else if (p?.stage === 'today') results = { key: 'results', title: 'Results', state: 'action', status: 'The test is today. Enter marks once it is over.' }
  else if (p?.stage === 'done') results = { key: 'results', title: 'Results', state: 'done', status: `${plural(p.result_out, 'result')} saved${p.absent ? `, ${p.absent} absent` : ''}.` }
  else results = { key: 'results', title: 'Results', state: 'later', status: p?.next_date ? `After the test on ${formatDate(p.next_date)}.` : 'After the test.' }

  return [details, students, paper, results]
}

/** The first step someone has to act on, if any. */
export const nextStep = (steps: TestStep[]) => steps.find((s) => s.state === 'action')?.key ?? null
