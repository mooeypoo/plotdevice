import { flushPromises } from '@vue/test-utils'

/** For tests: something that holds a SelectField, as a wrapper or an element. */
type Holder = Element | { readonly element: Element }

function triggerOf(holder: Holder): HTMLButtonElement {
  const element = holder instanceof Element ? holder : holder.element
  const trigger = element.matches('[role="combobox"]')
    ? element
    : element.querySelector('[role="combobox"]')
  if (!(trigger instanceof HTMLButtonElement)) throw new Error('No select found')
  return trigger
}

async function openList(holder: Holder): Promise<HTMLElement> {
  const trigger = triggerOf(holder)
  if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
  await flushPromises()
  const selector = `#${CSS.escape(trigger.getAttribute('aria-controls') ?? '')}`
  // The list is drawn in the body, or inside the popover holding the select.
  const root = trigger.getRootNode()
  const list =
    document.querySelector<HTMLElement>(selector) ??
    (root instanceof Element || root instanceof Document
      ? root.querySelector<HTMLElement>(selector)
      : null)
  if (list === null) throw new Error('The select did not open')
  return list
}

/** For tests: opens a SelectField and picks the option with this value, as a user would. */
export async function chooseOption(holder: Holder, value: string): Promise<void> {
  const list = await openList(holder)
  const option = [...list.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.dataset['value'] === value
  )
  if (option === undefined) throw new Error(`No option with value ${value}`)
  option.click()
  await flushPromises()
}

/** For tests: the options a SelectField offers, read by opening and closing it. */
export async function optionsOf(holder: Holder): Promise<HTMLElement[]> {
  const list = await openList(holder)
  const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')]
  triggerOf(holder).click()
  await flushPromises()
  return options
}

/** For tests: the visible value of a SelectField. */
export function selectedLabel(holder: Holder): string {
  return triggerOf(holder).querySelector('.value')?.textContent ?? ''
}

/** For tests: the labels of the options a SelectField offers, in order. */
export async function optionLabels(holder: Holder): Promise<string[]> {
  return (await optionsOf(holder)).map(
    (option) => option.querySelector('.label')?.textContent.trim() ?? ''
  )
}

/** For tests: the values of the options a SelectField offers, in order. */
export async function optionValues(holder: Holder): Promise<string[]> {
  return (await optionsOf(holder)).map((option) => option.dataset['value'] ?? '')
}
