import re

with open('src/app/milestones/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace getInitialFetchState
initial_fetch_state = """const getInitialFetchState = (): MilestonesFetchState => {
  try {
    const persisted = listMilestones();
    let display: Milestone[];
    if (persisted.length > 0) {
      display = persisted;
    } else {
      let dismissed = true;
      try {
        dismissed = getItem(SAMPLE_DISMISSED_KEY) === 'true';
      } catch {
        // ignore
      }
      display = dismissed ? [] : SAMPLE_MILESTONES;
    }
    
    if (display.length === 0) {
      return { status: 'empty' };
    } else {
      return { status: 'success', milestones: display };
    }
  } catch (err) {
    return { status: 'error', error: { code: 'FETCH_FAILED', message: 'Unable to load milestones' } };
  }
};

const getInitialIsDismissed = (): boolean => {
  try {
    const persisted = listMilestones();
    if (persisted.length > 0) return true;
    return getItem(SAMPLE_DISMISSED_KEY) === 'true';
  } catch {
    return true; // fail safe
  }
};"""

content = re.sub(
    r'const getInitialFetchState = \(\): MilestonesFetchState => \{\s*return \{ status: \'loading\' \};\s*\};',
    initial_fetch_state,
    content
)

# Update `isDismissed` initialization
content = content.replace(
    'const [isDismissed, setIsDismissed] = useState<boolean>(false);',
    'const [isDismissed, setIsDismissed] = useState<boolean>(getInitialIsDismissed);'
)

# Remove the useEffect that calls loadMilestones() on mount, since we initialize synchronously.
# Wait, `contracts/page.tsx` does NOT call `loadContracts()` on mount.
# But it does call it on explicit refetch/retry.
content = re.sub(
    r'  useEffect\(\(\) => \{\s*loadMilestones\(\);\s*\}, \[loadMilestones\]\);',
    '',
    content
)

with open('src/app/milestones/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched page.tsx for synchronous initialization.')
