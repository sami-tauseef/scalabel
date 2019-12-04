import * as THREE from 'three'
import { LabelTypeName, ShapeTypeName } from '../../common/types'
import { LabelType, ShapeType, State } from '../../functional/types'
import { Vector3D } from '../../math/vector3d'
import { getColorById } from '../util'
import { TransformationControl } from './control/transformation_control'
import { Label3DList } from './label3d_list'
import { Plane3D } from './plane3d'
import { Shape3D } from './shape3d'

/** Convert string to label type name enum */
export function labelTypeFromString (type: string): LabelTypeName {
  switch (type) {
    case LabelTypeName.BOX_3D:
      return LabelTypeName.BOX_3D
    case LabelTypeName.PLANE_3D:
      return LabelTypeName.PLANE_3D
  }
  return LabelTypeName.EMPTY
}

/**
 * Abstract class for 3D drawable labels
 */
export abstract class Label3D {
  /** label id in state */
  protected _labelId: number
  /** track id in state */
  protected _trackId: number
  /** index of the label */
  protected _index: number
  /** drawing order of the label */
  protected _order: number
  /** the corresponding label in the state */
  protected _label: LabelType | null
  /** whether the label is selected */
  protected _selected: boolean
  /** whether the label is highlighted */
  protected _highlighted: boolean
  /** rgba color decided by labelId */
  protected _color: number[]
  /** plane if attached */
  protected _plane: Plane3D | null
  /** parent label if any */
  protected _parent: Label3D | null
  /** children if any */
  protected _children: Label3D[]
  /** Whether this is temporary */
  protected _temporary: boolean

  constructor (labelList: Label3DList) {
    this._index = -1
    this._labelId = -1
    this._trackId = -1
    this._order = -1
    this._selected = false
    this._highlighted = false
    this._label = null
    this._color = [0, 0, 0, 1]
    this._plane = null
    this._parent = null
    this._children = []
    this._temporary = false
  }

  /**
   * Set index of this label
   */
  public set index (i: number) {
    this._index = i
  }

  /** get index */
  public get index (): number {
    return this._index
  }

  /** get labelId */
  public get labelId (): number {
    return this._labelId
  }

  /** get label state */
  public get label (): Readonly<LabelType> {
    if (!this._label) {
      throw new Error('Label uninitialized')
    }
    return this._label
  }

  /** Get parent label */
  public get parent (): Label3D | null {
    return this._parent
  }

  /** Set parent label */
  public set parent (parent: Label3D | null) {
    this._parent = parent
    if (parent && this._label) {
      this._label.parent = parent.labelId
    } else if (this._label) {
      this._label.parent = -1
    }
  }

  /** Get children */
  public get children (): Readonly<Label3D[]> {
    return this._children
  }

  /** select the label */
  public set selected (s: boolean) {
    this._selected = s
  }

  /** return whether label selected */
  public get selected (): boolean {
    return this._selected
  }

  /** Return whether this label is temporary (not committed to state) */
  public get temporary (): boolean {
    return this._temporary
  }

  /** Get shape id's and shapes for updating */
  public abstract shapeStates (): [number[], ShapeTypeName[], ShapeType[]]

  /** highlight the label */
  public setHighlighted (intersection?: THREE.Intersection) {
    if (intersection) {
      this._highlighted = true
    } else {
      this._highlighted = false
    }
  }

  /** add child */
  public addChild (child: Label3D) {
    if (child.parent !== this) {
      if (child.parent) {
        child.parent.removeChild(child)
      }
      this._children.push(child)
      child.parent = this
      if (this._label) {
        this._label.children.push(child.labelId)
      }
    }
  }

  /** remove child */
  public removeChild (child: Label3D) {
    const index = this._children.indexOf(child)
    if (index >= 0) {
      this._children.splice(index, 1)
      child.parent = null
      if (this._label) {
        const stateIndex = this._label.children.indexOf(child.labelId)
        if (stateIndex >= 0) {
          this._label.children.splice(stateIndex, 1)
        }
      }
    }
  }

  /** get category */
  public get category (): number[] {
    if (this._label && this._label.category) {
      return this._label.category
    }
    return []
  }

  /** get attributes */
  public get attributes (): {[key: number]: number[]} {
    if (this._label && this._label.attributes) {
      return this._label.attributes
    }
    return {}
  }

  /** Set active camera for label */
  public set activeCamera (_camera: THREE.Camera) {
    return
  }

  /** Attach control */
  public abstract attachControl (control: TransformationControl): void

  /** Attach control */
  public abstract detachControl (): void

  /**
   * Handle mouse move
   * @param projection
   */
  public abstract onMouseDown (
    x: number, y: number, camera: THREE.Camera
  ): boolean

  /**
   * Handle mouse up
   * @param projection
   */
  public abstract onMouseUp (): void

  /**
   * Handle mouse move
   * @param projection
   */
  public abstract onMouseMove (
    x: number, y: number, camera: THREE.Camera
  ): boolean

  /** Rotate label in direction of quaternion */
  public abstract rotate (quaternion: THREE.Quaternion): void

  /** Translate label in provided direction */
  public abstract translate (delta: THREE.Vector3): void

  /** Scale label */
  public abstract scale (scale: THREE.Vector3, anchor: THREE.Vector3): void

  /** Center of label */
  public get center (): THREE.Vector3 {
    return new THREE.Vector3()
  }

  /** Orientation of label */
  public get orientation (): THREE.Quaternion {
    return new THREE.Quaternion()
  }

  /**
   * Initialize label
   * @param {State} state
   */
  public abstract init (
    itemIndex: number,
    category: number,
    center?: Vector3D,
    sensors?: number[],
    temporary?: boolean
  ): void

  /**
   * Return a list of the shape for inspection and testing
   */
  public abstract shapes (): Shape3D[]

  /** Convert label state to drawable */
  public updateState (
    state: State,
    itemIndex: number,
    labelId: number
  ): void {
    const item = state.task.items[itemIndex]
    this._label = item.labels[labelId]
    this._labelId = this._label.id
    this._trackId = this._label.track
    this._color = getColorById(this._labelId, this._trackId)
  }
}

export default Label3D
