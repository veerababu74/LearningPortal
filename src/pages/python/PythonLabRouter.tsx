import { Link, useParams } from 'react-router-dom'
import { DecoratorUnwrapLab } from './labs/DecoratorUnwrapLab'
import { GeneratorStepperLab } from './labs/GeneratorStepperLab'
import { GilVsAsyncLab } from './labs/GilVsAsyncLab'
import { MroTracerLab } from './labs/MroTracerLab'
import { MutableTrapLab } from './labs/MutableTrapLab'
import { NameVsObjectLab } from './labs/NameVsObjectLab'

const MAP = {
  'name-vs-object': NameVsObjectLab,
  'mutable-trap': MutableTrapLab,
  'decorator-unwrap': DecoratorUnwrapLab,
  'generator-stepper': GeneratorStepperLab,
  'gil-vs-async': GilVsAsyncLab,
  'mro-tracer': MroTracerLab,
} as const

export function PythonLabRouter() {
  const { labId = '' } = useParams()
  const Comp = MAP[labId as keyof typeof MAP]
  if (!Comp) {
    return (
      <div className="py-page">
        <h1>Lab not found</h1>
        <Link to="/python/labs">Back to Python labs</Link>
      </div>
    )
  }
  return <Comp />
}
