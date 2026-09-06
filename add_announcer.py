with open('src/app/milestones/page.tsx', 'r', encoding='utf-8') as f:
    original = f.read()

announcer = """
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {fetchState.status === 'loading'
          ? 'Loading milestones'
          : fetchState.status === 'error'
            ? 'Unable to load milestones'
            : fetchState.status === 'empty'
              ? 'No milestones tracked'
              : `${sortedMilestones.length} ${sortedMilestones.length === 1 ? 'milestone' : 'milestones'} found`}
      </p>
"""

new_content = original.replace(
    '<h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold mb-6 focus:outline-none">\n        Milestones\n      </h1>',
    '<h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold mb-6 focus:outline-none">\n        Milestones\n      </h1>\n' + announcer
)

with open('src/app/milestones/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
