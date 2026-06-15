import { CmsManagedApp } from "@our-org/cms-managed";
import { overrides } from "./cms-custom";

export default function App() {
  return <CmsManagedApp overrides={overrides} />;
}
