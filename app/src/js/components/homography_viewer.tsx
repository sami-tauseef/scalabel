import { withStyles } from '@material-ui/styles'
import React from 'react'
import { ImageViewerConfigType } from '../functional/types'
import { viewerStyles } from '../styles/viewer'
import { DrawableViewer, ViewerProps } from './drawable_viewer'
import HomographyCanvas from './homography_canvas'

/**
 * Viewer for images and 2d labels
 */
class HomographyViewer extends DrawableViewer {
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
        <HomographyCanvas
          key={`homographyCanvas${this.props.id}`}
          display={this._container}
          id={this.props.id}
        />
      )
    }

    return views
  }

  /**
   * Handle double click
   * @param e
   */
  protected onDoubleClick () {
    return
  }

  /**
   * Handle mouse leave
   * @param e
   */
  protected onMouseLeave () {
    return
  }

  /**
   * Handle mouse wheel
   * @param e
   */
  protected onWheel (e: WheelEvent) {
    e.preventDefault()
  }
}

export default withStyles(viewerStyles)(HomographyViewer)
