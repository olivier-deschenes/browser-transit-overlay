import { useDebouncer } from '@tanstack/react-pacer'
import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'

// How long the reader has to pause before what they typed is searched for.
const WAIT = 250

// A search box that tells the page what to search for once the reader pauses
// in their typing, rather than at every keystroke, so that the list is not
// narrowed over and over as a word is spelled out. Enter searches straight
// away, and Escape or the clear button empties the box and the search.
export function SearchField({
  value,
  onSearch,
  onFocus,
  busy = false,
  label,
  placeholder,
  clearLabel,
  className,
}: {
  // What the page is searching for.
  value: string
  onSearch: (value: string) => void
  onFocus?: () => void
  // Whether the search is still waiting on something, and shows it.
  busy?: boolean
  label: string
  placeholder: string
  clearLabel: string
  className?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value)

  // What the box last told the page to search for. The page can also change
  // its search without the box, when it reads its address once it runs in
  // the browser, or when the reader comes back to an earlier search, and
  // then the box shows that search instead.
  const told = useRef(value)

  useEffect(() => {
    if (value !== told.current) {
      told.current = value
      setText(value)
    }
  }, [value])

  const search = useDebouncer(
    (typed: string) => {
      told.current = typed.trim()
      onSearch(told.current)
    },
    { wait: WAIT },
  )

  const clear = () => {
    setText('')
    search.maybeExecute('')
    search.flush()
    input.current?.focus()
  }

  return (
    <form
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        search.flush()
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <InputGroup className="h-9">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={input}
          id={id}
          type="search"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          onFocus={onFocus}
          onChange={(event) => {
            setText(event.target.value)
            search.maybeExecute(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && text) {
              event.preventDefault()
              clear()
            }
          }}
          // The box draws its own clear button, the same in every browser.
          className="[&::-webkit-search-cancel-button]:appearance-none"
        />
        {(busy || text) && (
          <InputGroupAddon align="inline-end">
            {busy && <Spinner aria-hidden />}
            {text && (
              <InputGroupButton
                size="icon-xs"
                aria-label={clearLabel}
                onClick={clear}
              >
                <X />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        )}
      </InputGroup>
    </form>
  )
}
