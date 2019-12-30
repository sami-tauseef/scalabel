import * as React from 'react'
import { withStyles } from '@material-ui/styles'
import { ImageViewerConfigType } from '../functional/types'
import { viewerStyles } from '../styles/viewer'
import { ViewerProps } from './drawable_viewer'
import ImageCanvas from './image_canvas'
import Label3dCanvas from './label3d_canvas'
import { Viewer2D } from './viewer2d'

/**
 * Viewer for 3d labels on images
 */
class Image3DViewer extends Viewer2D {
  /**
   * Constructor
   * @param {Object} props: react props
   */
  constructor (props: ViewerProps) {
    super(props)
  }

  /**
   * Render function
   * @return {React.Fragment} React fragment
   */
  protected getDrawableComponents () {
    if (this._container && this._viewerConfig) {
      this._container.scrollTop =
        (this._viewerConfig as ImageViewerConfigType).displayTop
      this._container.scrollLeft =
        (this._viewerConfig as ImageViewerConfigType).displayLeft
    }

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
        />
      )
    }

    return views
  }
}

export default withStyles(viewerStyles)(Image3DViewer)
