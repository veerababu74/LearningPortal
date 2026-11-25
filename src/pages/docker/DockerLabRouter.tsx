import { Link, useParams } from 'react-router-dom'
import { ComposeNetworkLab } from './labs/ComposeNetworkLab'
import { DebugLab } from './labs/DebugLab'
import { LayerExplorerLab } from './labs/LayerExplorerLab'
import { PortVisualizerLab } from './labs/PortVisualizerLab'
import { StorageLab } from './labs/StorageLab'

const MAP = {
  'layer-explorer': LayerExplorerLab,
  'port-visualizer': PortVisualizerLab,
  'storage-lab': StorageLab,
  'compose-network': ComposeNetworkLab,
  'debug-lab': DebugLab,
} as const

export function DockerLabRouter() {
  const { labId = '' } = useParams()
  const Comp = MAP[labId as keyof typeof MAP]
  if (!Comp) {
    return (
      <div className="dk-page">
        <h1>Lab not found</h1>
        <Link to="/docker/labs">Back to Docker labs</Link>
      </div>
    )
  }
  return <Comp />
}
