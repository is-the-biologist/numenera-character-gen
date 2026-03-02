import { allTypes, allDescriptors, allFoci } from './data';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <h1 className="text-3xl font-bold text-cyan-400 mb-4">
        Numenera Character Generator
      </h1>
      <p className="text-slate-400 mb-8">
        Loaded {allTypes.length} types, {allDescriptors.length} descriptors, {allFoci.length} foci.
      </p>
    </div>
  );
}

export default App;
