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
  /** canvas for drawing image & getting colors */
  private _hiddenCanvas: HTMLCanvasElement
  /** context of image canvas */
  private _hiddenContext: CanvasRenderingContext2D | null

  constructor (props: Props) {
    super(props)
    this._plane = null
    this._intrinsicProjection = new THREE.Matrix3()
    this._intrinsicInverse = new THREE.Matrix3()
    this._homographyMatrix = new THREE.Matrix3()
    this._hiddenCanvas = document.createElement('canvas')
    this._hiddenContext = null
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
        if (this._image !== Session.images[item][sensorId]) {
          this._image = Session.images[item][sensorId]
          if (!this._hiddenContext) {
            this._hiddenCanvas.width = this._image.width
            this._hiddenCanvas.height = this._image.height
            this._hiddenContext = this._hiddenCanvas.getContext('2d')
          }
          if (this._hiddenContext) {
            this._hiddenContext.drawImage(this._image, 0, 0)
          }
        }
      }

      if (this._image && sensorId in this.state.task.sensors) {
        const sensor = this.state.task.sensors[sensorId]
        if (sensor.intrinsics &&
            sensor.extrinsics &&
            isCurrentFrameLoaded(state, sensorId)) {

          // Set intrinsics
          const intrinsics = sensor.intrinsics
          const fx = intrinsics.focalLength.x / this._image.width
          const cx = intrinsics.focalCenter.x / this._image.width
          const fy = intrinsics.focalLength.y / this._image.height
          const cy = intrinsics.focalCenter.y / this._image.height
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
          console.log(cameraDirection)

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

          const newPosition = new THREE.Vector3()
          newPosition.copy(planeDirection)
          newPosition.multiplyScalar(5)
          newPosition.add(grid.center.toThree())
          const cameraPosition = new THREE.Vector3(
            sensor.extrinsics.translation.x,
            sensor.extrinsics.translation.y,
            sensor.extrinsics.translation.z
          )

          const positionDiff = new THREE.Vector3()
          positionDiff.copy(newPosition)
          positionDiff.sub(cameraPosition)

          const distance = Math.abs(positionDiff.dot(planeDirection))

          const translationToBirdsEye = new THREE.Vector3()
          translationToBirdsEye.copy(cameraPosition)
          translationToBirdsEye.applyMatrix3(rotationToNormal)
          translationToBirdsEye.sub(newPosition)

          const rotationNormalization = new THREE.Matrix3()
          rotationNormalization.set(
            translationToBirdsEye.x * planeDirection.x / distance,
            translationToBirdsEye.x * planeDirection.y / distance,
            translationToBirdsEye.x * planeDirection.z / distance,
            translationToBirdsEye.y * planeDirection.x / distance,
            translationToBirdsEye.y * planeDirection.y / distance,
            translationToBirdsEye.y * planeDirection.z / distance,
            translationToBirdsEye.z * planeDirection.x / distance,
            translationToBirdsEye.z * planeDirection.y / distance,
            translationToBirdsEye.z * planeDirection.z / distance
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
    if (this.imageCanvas && this.imageContext && this._hiddenContext) {
      if (this._plane && this._image) {
        const homographyInverse = new THREE.Matrix3()
        homographyInverse.getInverse(this._homographyMatrix)
        const imageData = this.imageContext.createImageData(
          this.imageCanvas.width, this.imageCanvas.height
        )
        for (let dstX = 0; dstX < this.imageCanvas.width; dstX++) {
          for (let dstY = 0; dstY < this.imageCanvas.height; dstY++) {
            // Get source coordinates
            const src = new THREE.Vector3(dstX, dstY, 1)
            src.applyMatrix3(this._intrinsicInverse)
            src.applyMatrix3(homographyInverse)
            src.applyMatrix3(this._intrinsicProjection)
            src.multiplyScalar(1. / src.z)

            const srcX =
              src.x / this.imageCanvas.width * this._hiddenCanvas.width
            const srcY =
              dstY / this.imageCanvas.height * this._hiddenCanvas.height

            const data =
              this._hiddenContext.getImageData(srcX, srcY, 1, 1).data
            imageData.data.set(data, (dstY * this.imageCanvas.width + dstX) * 4)
          }
        }

        this.imageContext.putImageData(imageData, 0, 0)
        console.log('birds eye drawn')
      } else {
        clearCanvas(this.imageCanvas, this.imageContext)
      }
    }
  }
}

export default withStyles(
  imageViewStyle, { withTheme: true }
)(HomographyViewer)
