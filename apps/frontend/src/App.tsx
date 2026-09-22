import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { Workspace } from "./components/layout/Workspace";
import { VERTICAL_RESIZE_HANDLE } from "./lib/resizeHandleStyles";

function WorkspacePage() {
  return (
    <PanelGroup direction="horizontal" className="min-h-0 flex-1">
      <Panel defaultSize={22} minSize={15} maxSize={40}>
        <Sidebar />
      </Panel>
      <PanelResizeHandle className={VERTICAL_RESIZE_HANDLE} />
      <Panel defaultSize={78} minSize={40}>
        <Workspace />
      </Panel>
    </PanelGroup>
  );
}

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <Routes>
        <Route path="/" element={<WorkspacePage />} />
      </Routes>
    </div>
  );
}
