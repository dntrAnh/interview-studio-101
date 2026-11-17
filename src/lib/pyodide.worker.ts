/// <reference lib="webworker" />
const PYODIDE_VERSION = "0.26.4";
let ready: Promise<any> | null = null;
function load() {
  if (!ready) ready = (async () => {
    const mod = await import(/* @vite-ignore */ `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.mjs`);
    return mod.loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` });
  })();
  return ready;
}
const HARNESS = `
import sys, io, time, traceback
def __run_case(__code, __stdin):
    out, err = io.StringIO(), io.StringIO()
    old = sys.stdin, sys.stdout, sys.stderr
    sys.stdin, sys.stdout, sys.stderr = io.StringIO(__stdin), out, err
    ok = True
    t = time.perf_counter()
    try:
        exec(compile(__code, "solution.py", "exec"), {"__name__": "__main__"})
    except SystemExit as e:
        ok = e.code in (None, 0)
        if not ok: err.write(f"SystemExit: {e.code}\\n")
    except BaseException:
        ok = False
        err.write(traceback.format_exc(limit=-3))
    finally:
        sys.stdin, sys.stdout, sys.stderr = old
    return [out.getvalue(), err.getvalue(), ok, time.perf_counter() - t]
`;
self.onmessage = async (e: MessageEvent) => {
  const { id, type, code, inputs } = e.data;
  try {
    const py = await load();
    if (type === "warm") { self.postMessage({ id, ok: true }); return; }
    py.runPython(HARNESS);
    const fn = py.globals.get("__run_case");
    const results = (inputs as string[]).map((input) => {
      const r = fn(code, input);
      const [stdout, stderr, ok, secs] = r.toJs(); r.destroy();
      return { stdout, stderr, ok, time: (secs as number).toFixed(3) };
    });
    fn.destroy();
    self.postMessage({ id, ok: true, results });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
