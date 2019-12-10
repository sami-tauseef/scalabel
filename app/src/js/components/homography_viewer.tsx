import { withStyles } from '@material-ui/styles'
import * as THREE from 'three'
import Session from '../common/session'
import { LabelTypeName } from '../common/types'
import { Grid3D } from '../drawable/3d/grid3d'
import { Plane3D } from '../drawable/3d/plane3d'
import { isCurrentFrameLoaded, isFrameLoaded } from '../functional/state_util'
import { State } from '../functional/types'
import { imageViewStyle } from '../styles/label'
import { clearCanvas, drawImageOnCanvas } from '../view_config/image'
import { ImageViewer, Props } from './image_viewer'

/**
 * Component for displaying birds eye view homography
 */
class HomographyViewer extends ImageViewer {
  /** image */
  private _image?: HTMLImageElement
  /** selected plane */
  private _plane: Plane3D | null
  /** intrinsic matrix */
  private _intrinsicProjection: THREE.Matrix3
  /** inverse of intrinsic */
  private _intrinsicInverse: THREE.Matrix3
  /** homography matrix, actually includes both homography and intrinsic */
  private _homographyMatrix: THREE.Matrix3

  constructor (props: Props) {
    super(props)
    this._plane = null
    this._intrinsicProjection = new THREE.Matrix3()
    this._intrinsicInverse = new THREE.Matrix3()
    this._homographyMatrix = new THREE.Matrix3()
  }

  /**
   * Function to redraw all canvases
   * @return {boolean}
   */
  public redraw (): boolean {
    if (this.imageCanvas && this.imageContext) {
      const item = this.state.user.select.item
      const sensor = this.state.user.viewerConfigs[this.props.id].sensor
      if (isFrameLoaded(this.state, item, sensor) &&
          item < Session.images.length &&
          sensor in Session.images[item]) {
        this._image = Session.images[item][sensor]
        // redraw imageCanvas
        if (this._plane) {
          this.drawHomography()
        } else {
          drawImageOnCanvas(this.imageCanvas, this.imageContext, this._image)
        }
      } else {
        clearCanvas(this.imageCanvas, this.imageContext)
      }
    }
    return true
  }

  /**
   * Override update state function
   * @param state
   */
  protected updateState (state: State): void {
    super.updateState(state)

    const selectedLabel = Session.label3dList.selectedLabel
    if (selectedLabel && selectedLabel.label.type === LabelTypeName.PLANE_3D) {
      this._plane = selectedLabel as Plane3D
    }

    if (this._plane && this.props.id in this.state.user.viewerConfigs) {
      const sensorId = this.state.user.viewerConfigs[this.props.id].sensor
      const item = state.user.select.item
      if (isFrameLoaded(state, item, sensorId)) {
        this._image = Session.images[item][sensorId]
      }
      if (sensorId in this.state.task.sensors) {
        const sensor = this.state.task.sensors[sensorId]
        if (sensor.intrinsics &&
            sensor.extrinsics &&
            isCurrentFrameLoaded(state, sensorId)) {
          const image =
            Session.images[state.user.select.item][sensorId]

          // Set intrinsics
          const intrinsics = sensor.intrinsics
          const fx = intrinsics.focalLength.x / image.width
          const cx = intrinsics.focalCenter.x / image.width
          const fy = intrinsics.focalLength.y / image.height
          const cy = intrinsics.focalCenter.y / image.height
          this._intrinsicProjection.set(
            fx, 0, cx,
            0, fy, cy,
            0, 0, 1
          )
          this._intrinsicInverse.getInverse(this._intrinsicProjection)

          // Extrinsics
          const extrinsicQuaternion = new THREE.Quaternion(
            sensor.extrinsics.rotation.x,
            sensor.extrinsics.rotation.y,
            sensor.extrinsics.rotation.z,
            sensor.extrinsics.rotation.w
          )

          const cameraDirection = new THREE.Vector3(0, 0, 1)
          cameraDirection.applyQuaternion(extrinsicQuaternion)

          const grid = this._plane.shapes()[0] as Grid3D
          const planeDirection = new THREE.Vector3()
          planeDirection.copy(grid.normal.toThree())

          const cameraToNormalQuaternion = new THREE.Quaternion()
          cameraToNormalQuaternion.setFromUnitVectors(
            cameraDirection, planeDirection
          )

          const rotationToNormalMaker = new THREE.Matrix4()
          rotationToNormalMaker.makeRotationFromQuaternion(
            cameraToNormalQuaternion
          )

          const rotationToNormal = new THREE.Matrix3()
          rotationToNormal.setFromMatrix4(rotationToNormalMaker)

          const newPosition = grid.center.toThree()
          const cameraPosition = new THREE.Vector3(
            sensor.extrinsics.translation.x,
            sensor.extrinsics.translation.y,
            sensor.extrinsics.translation.z
          )

          const translationToBirdsEye = new THREE.Vector3()
          translationToBirdsEye.copy(cameraPosition)
          translationToBirdsEye.applyMatrix3(rotationToNormal)
          translationToBirdsEye.sub(newPosition)

          const rotationNormalization = new THREE.Matrix3()
          rotationNormalization.set(
            translationToBirdsEye.x * planeDirection.x,
            translationToBirdsEye.x * planeDirection.y,
            translationToBirdsEye.x * planeDirection.z,
            translationToBirdsEye.y * planeDirection.x,
            translationToBirdsEye.y * planeDirection.y,
            translationToBirdsEye.y * planeDirection.z,
            translationToBirdsEye.z * planeDirection.x,
            translationToBirdsEye.z * planeDirection.y,
            translationToBirdsEye.z * planeDirection.z
          )

          for (let i = 0; i < 9; i++) {
            this._homographyMatrix.elements[i] =
              rotationToNormal.elements[i] - rotationNormalization.elements[i]
          }
        }
      }
    }
  }

  /**
   * Draw image with birds eye view homography
   */
  private drawHomography () {
    if (this.imageCanvas && this.imageContext) {
      if (this._plane) {

      } else {
        clearCanvas(this.imageCanvas, this.imageContext)
      }
    }
  }
}

export default withStyles(
  imageViewStyle, { withTheme: true }
)(HomographyViewer)
