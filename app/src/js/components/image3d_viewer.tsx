import { withStyles } from '@material-ui/styles'
import * as React from 'react'
import * as THREE from 'three'
import Session from '../common/session'
import { IntrinsicCamera } from '../drawable/3d/intrinsic_camera'
import { isCurrentFrameLoaded } from '../functional/state_util'
import { Image3DViewerConfigType } from '../functional/types'
import { viewerStyles } from '../styles/viewer'
import { ViewerProps } from './drawable_viewer'
import ImageCanvas from './image_canvas'
import Label3dCanvas from './label3d_canvas'
import { Viewer2D } from './viewer2d'

/**
 * Viewer for 3d labels on images
 */
class Image3DViewer extends Viewer2D {
  /** Intrinsic camera */
  private _camera: IntrinsicCamera

  /**
   * Constructor
   * @param {Object} props: react props
   */
  constructor (props: ViewerProps) {
    super(props)
    this._camera = new IntrinsicCamera()
  }

  /**
   * Render function
   * @return {React.Fragment} React fragment
   */
  protected getDrawableComponents () {
    const img3dConfig = this._viewerConfig as Image3DViewerConfigType
    if (this._container && this._viewerConfig) {
      this._container.scrollTop = img3dConfig.displayTop
      this._container.scrollLeft = img3dConfig.displayLeft
    }
    const sensor = img3dConfig.sensor
    if (isCurrentFrameLoaded(this.state, img3dConfig.sensor)) {
      const image =
        Session.images[this.state.user.select.item][img3dConfig.sensor]
      this._camera.width = image.width
      this._camera.height = image.height
    }
    if (sensor in this.state.task.sensors) {
      this._camera.intrinsics = this.state.task.sensors[sensor].intrinsics
      const extrinsics = this.state.task.sensors[sensor].extrinsics
      this._camera.position.set(0, 0, 0)
      if (extrinsics) {
        this._camera.quaternion.set(
          extrinsics.rotation.x,
          extrinsics.rotation.y,
          extrinsics.rotation.z,
          extrinsics.rotation.w
        )
        this._camera.quaternion.multiply(
          (new THREE.Quaternion()).setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), Math.PI
          )
        )
        this._camera.position.set(
          extrinsics.translation.x,
          extrinsics.translation.y,
          extrinsics.translation.z
        )
      }
    }

    this._camera.calculateProjectionMatrix()

    const views: React.ReactElement[] = []
    if (this._viewerConfig) {
      views.push(
        <ImageCanvas
          key={`imageCanvas${this.props.id}`}
          display={this._container}
          id={this.props.id}
        />
      )
      views.push(
        <Label3dCanvas
          key={`label3dCanvas${this.props.id}`}
          display={this._container}
          id={this.props.id}
          camera={this._camera}
        />
      )
    }

    return views
  }
}

export default withStyles(viewerStyles)(Image3DViewer)
